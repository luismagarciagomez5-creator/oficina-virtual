import { describe, expect, it, vi } from 'vitest';
import type { OrchestratorActor } from '../src/central-orchestrator';
import {
  applyOpenRouterConnectionReport,
  buildOpenRouterConnectionAdapterRequest,
  createOpenRouterConnectionAdapterState,
  createOpenRouterConnectionState,
  handleOpenRouterConnectionBackendAction,
  handleOpenRouterConnectionRequest,
  type OpenRouterConnectionAdapterPorts,
  type OpenRouterConnectionBackendAction,
  type OpenRouterConnectionKind,
  type OpenRouterConnectionState,
  type OpenRouterManagedConnection,
} from '../src/central-orchestration';

const WORKSPACE_ID = 'workspace-demo';
const NOW = '2026-07-16T12:00:00.000Z';
const ADMIN: OrchestratorActor = { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID };
const SYSTEM: OrchestratorActor = { actorId: 'openrouter-backend', role: 'system', workspaceId: WORKSPACE_ID };

const MANAGED_CONNECTION: OpenRouterManagedConnection = {
  connectionId: 'openrouter-connection-42',
  workspaceId: WORKSPACE_ID,
  connectionKind: 'shared',
  credentialRef: 'vault-ref-42',
  status: 'active',
};

function ports(overrides: Partial<OpenRouterConnectionAdapterPorts> = {}): OpenRouterConnectionAdapterPorts {
  return {
    registry: {
      provision: vi.fn().mockResolvedValue({ success: true, connection: MANAGED_CONNECTION }),
      findById: vi.fn().mockResolvedValue(MANAGED_CONNECTION),
      markRevoked: vi.fn().mockResolvedValue({ success: true }),
      ...overrides.registry,
    },
    credentialVault: {
      hasCredential: vi.fn().mockResolvedValue(true),
      revokeCredential: vi.fn().mockResolvedValue({ success: true }),
      ...overrides.credentialVault,
    },
    gateway: {
      verify: vi.fn().mockResolvedValue({ success: true }),
      ...overrides.gateway,
    },
  };
}

function pendingConnection(
  action: 'connect' | 'verify' | 'revoke' = 'connect',
  connectionKind: OpenRouterConnectionKind = 'shared',
): { state: OpenRouterConnectionState; backendAction: OpenRouterConnectionBackendAction; requestId: string } {
  let state = createOpenRouterConnectionState(WORKSPACE_ID);
  if (action !== 'connect') {
    const connect = handleOpenRouterConnectionRequest(state, ADMIN, {
      requestId: 'seed-connect', workspaceId: WORKSPACE_ID, action: 'connect', connectionKind, occurredAt: NOW,
    });
    if (connect.status !== 'accepted') throw new Error('Unable to seed connection request');
    const connected = applyOpenRouterConnectionReport(connect.state, SYSTEM, {
      reportId: 'seed-report',
      requestId: 'seed-connect',
      workspaceId: WORKSPACE_ID,
      connectionId: MANAGED_CONNECTION.connectionId,
      connectionKind,
      status: 'connected',
      hasCredential: true,
      statusDetail: null,
      occurredAt: NOW,
    });
    if (connected.status !== 'accepted') throw new Error('Unable to seed connected state');
    state = connected.state;
  }

  const requestId = `${action}-request`;
  const request = action === 'connect'
    ? { requestId, workspaceId: WORKSPACE_ID, action, connectionKind, occurredAt: NOW }
    : { requestId, workspaceId: WORKSPACE_ID, action, occurredAt: NOW };
  const accepted = handleOpenRouterConnectionRequest(state, ADMIN, request);
  if (accepted.status !== 'accepted') throw new Error(`Unable to create pending ${action} request`);
  return { state: accepted.state, backendAction: accepted.backendAction, requestId };
}

function adapterRequest(
  backendAction: OpenRouterConnectionBackendAction,
  connectionKind: OpenRouterConnectionKind,
  requestId: string,
) {
  return buildOpenRouterConnectionAdapterRequest(backendAction, connectionKind, requestId, `${requestId}-report`, NOW);
}

describe('OpenRouter connection backend adapter', () => {
  it('provisions and verifies a shared connection without exposing credential material', async () => {
    const pending = pendingConnection('connect', 'shared');
    const adapterPorts = ports();
    const result = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      adapterRequest(pending.backendAction, 'shared', pending.requestId),
      adapterPorts,
    );

    expect(result).toMatchObject({
      status: 'accepted',
      report: {
        requestId: 'connect-request',
        connectionId: 'openrouter-connection-42',
        connectionKind: 'shared',
        status: 'connected',
        hasCredential: true,
      },
      connectionState: {
        binding: { status: 'connected', pendingAction: null, connectionId: 'openrouter-connection-42' },
      },
    });
    expect(adapterPorts.registry.provision).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      connectionKind: 'shared',
      idempotencyKey: 'connect-request',
    });
    expect(adapterPorts.gateway.verify).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      connectionId: 'openrouter-connection-42',
      credentialRef: 'vault-ref-42',
    });
    expect(JSON.stringify(result)).not.toMatch(/credentialRef|apiKey|token|secret/i);
  });

  it('supports a dedicated connection through the same backend boundary', async () => {
    const pending = pendingConnection('connect', 'dedicated');
    const dedicated = { ...MANAGED_CONNECTION, connectionKind: 'dedicated' as const };
    const adapterPorts = ports({
      registry: {
        provision: vi.fn().mockResolvedValue({ success: true, connection: dedicated }),
        findById: vi.fn(),
        markRevoked: vi.fn(),
      },
    });
    const result = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      adapterRequest(pending.backendAction, 'dedicated', pending.requestId),
      adapterPorts,
    );
    expect(result).toMatchObject({ status: 'accepted', report: { connectionKind: 'dedicated', status: 'connected' } });
  });

  it('verifies an existing connection and applies the authenticated report', async () => {
    const pending = pendingConnection('verify');
    const result = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      adapterRequest(pending.backendAction, 'shared', pending.requestId),
      ports(),
    );
    expect(result).toMatchObject({
      status: 'accepted',
      report: { status: 'connected', statusDetail: null },
      connectionState: { binding: { status: 'connected', pendingAction: null } },
    });
  });

  it('revokes the vault reference and registry record idempotently', async () => {
    const pending = pendingConnection('revoke');
    const adapterPorts = ports();
    const initialAdapterState = createOpenRouterConnectionAdapterState(WORKSPACE_ID);
    const request = adapterRequest(pending.backendAction, 'shared', pending.requestId);
    const first = await handleOpenRouterConnectionBackendAction(pending.state, initialAdapterState, SYSTEM, request, adapterPorts);
    expect(first).toMatchObject({
      status: 'accepted',
      report: { status: 'revoked', hasCredential: false },
      connectionState: { binding: { status: 'revoked', pendingAction: null, hasCredential: false } },
    });
    if (first.status !== 'accepted') throw new Error('Expected accepted revocation');

    const duplicate = await handleOpenRouterConnectionBackendAction(
      first.connectionState, first.adapterState, SYSTEM, request, adapterPorts,
    );
    expect(duplicate).toMatchObject({ status: 'duplicate', report: { status: 'revoked' } });
    expect(adapterPorts.credentialVault.revokeCredential).toHaveBeenCalledTimes(1);
    expect(adapterPorts.registry.markRevoked).toHaveBeenCalledTimes(1);
  });

  it('turns missing credentials and provider failures into safe error reports', async () => {
    const missingPending = pendingConnection('connect');
    const missing = await handleOpenRouterConnectionBackendAction(
      missingPending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      adapterRequest(missingPending.backendAction, 'shared', missingPending.requestId),
      ports({
        credentialVault: {
          hasCredential: vi.fn().mockResolvedValue(false),
          revokeCredential: vi.fn(),
        },
      }),
    );
    expect(missing).toMatchObject({
      status: 'accepted',
      report: { status: 'error', hasCredential: false, statusDetail: 'La credencial no está disponible en el almacén seguro del backend.' },
    });

    const verifyPending = pendingConnection('verify');
    const failed = await handleOpenRouterConnectionBackendAction(
      verifyPending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      adapterRequest(verifyPending.backendAction, 'shared', verifyPending.requestId),
      ports({ gateway: { verify: vi.fn().mockResolvedValue({ success: false, code: 'authentication_failed' }) } }),
    );
    expect(failed).toMatchObject({
      status: 'accepted',
      report: { status: 'error', hasCredential: true, statusDetail: 'OpenRouter rechazó la credencial configurada.' },
    });
  });

  it('rejects invalid, unauthorized, and cross-workspace adapter requests before touching ports', async () => {
    const pending = pendingConnection();
    const adapterPorts = ports();
    const state = createOpenRouterConnectionAdapterState(WORKSPACE_ID);
    const request = adapterRequest(pending.backendAction, 'shared', pending.requestId);

    expect(await handleOpenRouterConnectionBackendAction(pending.state, state, ADMIN, request, adapterPorts)).toEqual({
      status: 'rejected', requestId: 'connect-request', code: 'unauthorized',
    });
    expect(await handleOpenRouterConnectionBackendAction(pending.state, state, SYSTEM, {
      ...request, workspaceId: 'other-workspace',
    }, adapterPorts)).toMatchObject({ status: 'rejected', requestId: 'connect-request', code: 'invalid_adapter_request' });
    expect(await handleOpenRouterConnectionBackendAction(pending.state, state, SYSTEM, {
      ...request,
      workspaceId: 'other-workspace',
      action: { ...request.action, workspaceId: 'other-workspace' },
    }, adapterPorts)).toEqual({ status: 'rejected', requestId: 'connect-request', code: 'workspace_mismatch' });
    expect(await handleOpenRouterConnectionBackendAction(pending.state, state, SYSTEM, {
      ...request, apiKey: 'sk-not-allowed',
    }, adapterPorts)).toMatchObject({ status: 'rejected', requestId: 'connect-request', code: 'invalid_adapter_request' });
    expect(adapterPorts.registry.provision).not.toHaveBeenCalled();
  });

  it('rejects registry records from another workspace or connection kind', async () => {
    const pending = pendingConnection();
    const request = adapterRequest(pending.backendAction, 'shared', pending.requestId);
    const wrongWorkspace = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      request,
      ports({
        registry: {
          provision: vi.fn().mockResolvedValue({
            success: true,
            connection: { ...MANAGED_CONNECTION, workspaceId: 'other-workspace' },
          }),
          findById: vi.fn(),
          markRevoked: vi.fn(),
        },
      }),
    );
    expect(wrongWorkspace).toEqual({ status: 'rejected', requestId: 'connect-request', code: 'connection_scope_mismatch' });

    const wrongKind = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      request,
      ports({
        registry: {
          provision: vi.fn().mockResolvedValue({
            success: true,
            connection: { ...MANAGED_CONNECTION, connectionKind: 'dedicated' },
          }),
          findById: vi.fn(),
          markRevoked: vi.fn(),
        },
      }),
    );
    expect(wrongKind).toEqual({ status: 'rejected', requestId: 'connect-request', code: 'connection_kind_mismatch' });
  });

  it('keeps infrastructure failures retryable without applying a false report', async () => {
    const pending = pendingConnection();
    const request = adapterRequest(pending.backendAction, 'shared', pending.requestId);
    const failedProvision = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      request,
      ports({
        registry: {
          provision: vi.fn().mockResolvedValue({ success: false, code: 'provision_failed' }),
          findById: vi.fn(),
          markRevoked: vi.fn(),
        },
      }),
    );
    expect(failedProvision).toEqual({ status: 'retryable_error', requestId: 'connect-request', code: 'provision_failed' });
    expect(pending.state.binding).toMatchObject({ status: 'pending', pendingAction: 'connect' });

    const thrown = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      request,
      ports({
        registry: {
          provision: vi.fn().mockRejectedValue(new Error('backend unavailable')),
          findById: vi.fn(),
          markRevoked: vi.fn(),
        },
      }),
    );
    expect(thrown).toEqual({ status: 'retryable_error', requestId: 'connect-request', code: 'dependency_failure' });
  });

  it('reports a revoked record returned during provisioning instead of reconnecting it', async () => {
    const pending = pendingConnection();
    const result = await handleOpenRouterConnectionBackendAction(
      pending.state,
      createOpenRouterConnectionAdapterState(WORKSPACE_ID),
      SYSTEM,
      adapterRequest(pending.backendAction, 'shared', pending.requestId),
      ports({
        registry: {
          provision: vi.fn().mockResolvedValue({
            success: true,
            connection: { ...MANAGED_CONNECTION, status: 'revoked' },
          }),
          findById: vi.fn(),
          markRevoked: vi.fn(),
        },
      }),
    );
    expect(result).toMatchObject({
      status: 'accepted',
      report: { status: 'error', hasCredential: false, statusDetail: 'La conexión ya está revocada en el backend.' },
    });
  });
});
