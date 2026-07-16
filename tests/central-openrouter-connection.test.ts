import { describe, expect, it } from 'vitest';
import type { OrchestratorActor } from '../src/central-orchestrator';
import {
  applyOpenRouterConnectionReport,
  createOpenRouterConnectionState,
  handleOpenRouterConnectionRequest,
  type OpenRouterConnectionState,
} from '../src/central-orchestration';

const WORKSPACE_ID = 'workspace-demo';
const NOW = '2026-07-16T11:00:00.000Z';
const ADMIN: OrchestratorActor = { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID };
const SYSTEM: OrchestratorActor = { actorId: 'openrouter-backend', role: 'system', workspaceId: WORKSPACE_ID };

function connectRequest(connectionKind: 'shared' | 'dedicated' = 'shared') {
  return { requestId: 'connect-1', workspaceId: WORKSPACE_ID, action: 'connect' as const, connectionKind, occurredAt: NOW };
}

function connectedReport(connectionKind: 'shared' | 'dedicated' = 'shared') {
  return {
    reportId: 'report-1',
    requestId: 'connect-1',
    workspaceId: WORKSPACE_ID,
    connectionId: 'or-connection-42',
    connectionKind,
    status: 'connected' as const,
    hasCredential: true,
    statusDetail: null,
    occurredAt: NOW,
  };
}

function acceptedRequestState(result: ReturnType<typeof handleOpenRouterConnectionRequest>): OpenRouterConnectionState {
  if (result.status !== 'accepted') throw new Error(`Expected accepted request, received ${result.status}`);
  return result.state;
}

function acceptedReportState(result: ReturnType<typeof applyOpenRouterConnectionReport>): OpenRouterConnectionState {
  if (result.status !== 'accepted') throw new Error(`Expected accepted report, received ${result.status}`);
  return result.state;
}

function connectedState(connectionKind: 'shared' | 'dedicated' = 'shared'): OpenRouterConnectionState {
  const pending = acceptedRequestState(handleOpenRouterConnectionRequest(
    createOpenRouterConnectionState(WORKSPACE_ID),
    ADMIN,
    connectRequest(connectionKind),
  ));
  return acceptedReportState(applyOpenRouterConnectionReport(pending, SYSTEM, connectedReport(connectionKind)));
}

describe('OpenRouter workspace connection boundary', () => {
  it('starts without connection metadata or credentials', () => {
    expect(createOpenRouterConnectionState(WORKSPACE_ID).binding).toEqual({
      workspaceId: WORKSPACE_ID,
      connectionId: null,
      connectionKind: null,
      status: 'not_configured',
      pendingAction: null,
      pendingRequestId: null,
      hasCredential: false,
      statusDetail: null,
      updatedAt: '1970-01-01T00:00:00.000Z',
      updatedBy: 'system',
    });
  });

  it('accepts shared or dedicated provisioning without accepting a connection id from the admin', () => {
    const result = handleOpenRouterConnectionRequest(createOpenRouterConnectionState(WORKSPACE_ID), ADMIN, connectRequest('shared'));
    expect(result).toMatchObject({
      status: 'accepted',
      state: { binding: { connectionKind: 'shared', connectionId: null, status: 'pending', pendingAction: 'connect' } },
      backendAction: { type: 'provision_connection', workspaceId: WORKSPACE_ID, connectionKind: 'shared' },
    });
    expect(JSON.stringify(result)).not.toMatch(/"apiKey"|"token"|"secret"|"credential"\s*:/i);

    const dedicated = handleOpenRouterConnectionRequest(createOpenRouterConnectionState(WORKSPACE_ID), ADMIN, {
      ...connectRequest('dedicated'),
      requestId: 'connect-dedicated',
    });
    expect(dedicated).toMatchObject({ status: 'accepted', backendAction: { connectionKind: 'dedicated' } });
  });

  it('lets only an authenticated system report assign the opaque connection id', () => {
    const pending = acceptedRequestState(handleOpenRouterConnectionRequest(
      createOpenRouterConnectionState(WORKSPACE_ID), ADMIN, connectRequest(),
    ));
    expect(applyOpenRouterConnectionReport(pending, ADMIN, connectedReport())).toEqual({
      status: 'rejected', reportId: 'report-1', code: 'unauthorized',
    });

    const result = applyOpenRouterConnectionReport(pending, SYSTEM, connectedReport());
    expect(result).toMatchObject({
      status: 'accepted',
      state: {
        binding: {
          connectionId: 'or-connection-42',
          status: 'connected',
          pendingAction: null,
          hasCredential: true,
        },
      },
    });
  });

  it('is idempotent without scheduling the backend action twice', () => {
    const initial = createOpenRouterConnectionState(WORKSPACE_ID);
    const first = handleOpenRouterConnectionRequest(initial, ADMIN, connectRequest());
    const pending = acceptedRequestState(first);
    expect(handleOpenRouterConnectionRequest(pending, ADMIN, connectRequest())).toMatchObject({
      status: 'duplicate', backendAction: null,
    });

    const report = applyOpenRouterConnectionReport(pending, SYSTEM, connectedReport());
    const connected = acceptedReportState(report);
    expect(applyOpenRouterConnectionReport(connected, SYSTEM, connectedReport())).toMatchObject({ status: 'duplicate' });
    expect(connected.audit).toHaveLength(2);
  });

  it('isolates requests and reports by workspace and actor role', () => {
    const initial = createOpenRouterConnectionState(WORKSPACE_ID);
    expect(handleOpenRouterConnectionRequest(initial, { ...ADMIN, workspaceId: 'other' }, connectRequest())).toEqual({
      status: 'rejected', requestId: 'connect-1', code: 'unauthorized',
    });
    expect(handleOpenRouterConnectionRequest(initial, ADMIN, { ...connectRequest(), workspaceId: 'other' })).toEqual({
      status: 'rejected', requestId: 'connect-1', code: 'workspace_mismatch',
    });

    const pending = acceptedRequestState(handleOpenRouterConnectionRequest(initial, ADMIN, connectRequest()));
    expect(applyOpenRouterConnectionReport(pending, { ...SYSTEM, workspaceId: 'other' }, connectedReport())).toEqual({
      status: 'rejected', reportId: 'report-1', code: 'unauthorized',
    });
    expect(applyOpenRouterConnectionReport(pending, SYSTEM, { ...connectedReport(), workspaceId: 'other' })).toEqual({
      status: 'rejected', reportId: 'report-1', code: 'workspace_mismatch',
    });
  });

  it('supports verify and revoke as backend-confirmed operations', () => {
    let state = connectedState();
    const verify = handleOpenRouterConnectionRequest(state, ADMIN, {
      requestId: 'verify-1', workspaceId: WORKSPACE_ID, action: 'verify', occurredAt: NOW,
    });
    expect(verify).toMatchObject({
      status: 'accepted',
      backendAction: { type: 'verify_connection', connectionId: 'or-connection-42' },
      state: { binding: { status: 'pending', pendingAction: 'verify' } },
    });
    state = acceptedRequestState(verify);
    state = acceptedReportState(applyOpenRouterConnectionReport(state, SYSTEM, {
      ...connectedReport(), reportId: 'verify-report', requestId: 'verify-1',
    }));

    const revoke = handleOpenRouterConnectionRequest(state, ADMIN, {
      requestId: 'revoke-1', workspaceId: WORKSPACE_ID, action: 'revoke', occurredAt: NOW,
    });
    expect(revoke).toMatchObject({
      status: 'accepted', backendAction: { type: 'revoke_connection', connectionId: 'or-connection-42' },
    });
    state = acceptedRequestState(revoke);
    state = acceptedReportState(applyOpenRouterConnectionReport(state, SYSTEM, {
      ...connectedReport(), reportId: 'revoke-report', requestId: 'revoke-1', status: 'revoked', hasCredential: false,
    }));
    expect(state.binding).toMatchObject({ status: 'revoked', pendingAction: null, hasCredential: false });
    expect(handleOpenRouterConnectionRequest(state, ADMIN, {
      requestId: 'verify-after-revoke', workspaceId: WORKSPACE_ID, action: 'verify', occurredAt: NOW,
    })).toEqual({ status: 'rejected', requestId: 'verify-after-revoke', code: 'connection_revoked' });
  });

  it('rejects mismatched reports and impossible credential states', () => {
    const pending = acceptedRequestState(handleOpenRouterConnectionRequest(
      createOpenRouterConnectionState(WORKSPACE_ID), ADMIN, connectRequest('shared'),
    ));
    expect(applyOpenRouterConnectionReport(pending, SYSTEM, connectedReport('dedicated'))).toEqual({
      status: 'rejected', reportId: 'report-1', code: 'connection_kind_mismatch',
    });
    expect(applyOpenRouterConnectionReport(pending, SYSTEM, { ...connectedReport(), hasCredential: false })).toMatchObject({
      status: 'rejected', reportId: 'report-1', code: 'invalid_connection_report',
    });
    expect(applyOpenRouterConnectionReport(createOpenRouterConnectionState(WORKSPACE_ID), SYSTEM, connectedReport())).toEqual({
      status: 'rejected', reportId: 'report-1', code: 'report_without_request',
    });
    expect(applyOpenRouterConnectionReport(pending, SYSTEM, { ...connectedReport(), requestId: 'stale-request' })).toEqual({
      status: 'rejected', reportId: 'report-1', code: 'request_mismatch',
    });
  });

  it('rejects overlapping operations, connection replacement, and stale connection metadata', () => {
    const pendingConnect = acceptedRequestState(handleOpenRouterConnectionRequest(
      createOpenRouterConnectionState(WORKSPACE_ID), ADMIN, connectRequest(),
    ));
    expect(handleOpenRouterConnectionRequest(pendingConnect, ADMIN, {
      ...connectRequest(), requestId: 'connect-overlap',
    })).toEqual({ status: 'rejected', requestId: 'connect-overlap', code: 'operation_in_progress' });

    let state = acceptedReportState(applyOpenRouterConnectionReport(pendingConnect, SYSTEM, connectedReport()));
    expect(handleOpenRouterConnectionRequest(state, ADMIN, {
      ...connectRequest('dedicated'), requestId: 'replace-active',
    })).toEqual({ status: 'rejected', requestId: 'replace-active', code: 'connection_active' });

    state = acceptedRequestState(handleOpenRouterConnectionRequest(state, ADMIN, {
      requestId: 'verify-connection', workspaceId: WORKSPACE_ID, action: 'verify', occurredAt: NOW,
    }));
    expect(applyOpenRouterConnectionReport(state, SYSTEM, {
      ...connectedReport(), reportId: 'wrong-connection-report', requestId: 'verify-connection', connectionId: 'stale-connection',
    })).toEqual({ status: 'rejected', reportId: 'wrong-connection-report', code: 'connection_mismatch' });

    state = acceptedReportState(applyOpenRouterConnectionReport(state, SYSTEM, {
      ...connectedReport(), reportId: 'verify-ok', requestId: 'verify-connection',
    }));
    state = acceptedRequestState(handleOpenRouterConnectionRequest(state, ADMIN, {
      requestId: 'revoke-transition', workspaceId: WORKSPACE_ID, action: 'revoke', occurredAt: NOW,
    }));
    expect(applyOpenRouterConnectionReport(state, SYSTEM, {
      ...connectedReport(), reportId: 'bad-revoke-report', requestId: 'revoke-transition',
    })).toEqual({ status: 'rejected', reportId: 'bad-revoke-report', code: 'unexpected_report_status' });
  });

  it('strictly rejects secret fields and admin-supplied connection ids', () => {
    const initial = createOpenRouterConnectionState(WORKSPACE_ID);
    expect(handleOpenRouterConnectionRequest(initial, ADMIN, { ...connectRequest(), apiKey: 'sk-not-allowed' })).toMatchObject({
      status: 'rejected', requestId: 'connect-1', code: 'invalid_connection_request',
    });
    expect(handleOpenRouterConnectionRequest(initial, ADMIN, { ...connectRequest(), connectionId: 'admin-picked-id' })).toMatchObject({
      status: 'rejected', requestId: 'connect-1', code: 'invalid_connection_request',
    });

    const pending = acceptedRequestState(handleOpenRouterConnectionRequest(initial, ADMIN, connectRequest()));
    expect(applyOpenRouterConnectionReport(pending, SYSTEM, { ...connectedReport(), apiKey: 'sk-not-allowed' })).toMatchObject({
      status: 'rejected', reportId: 'report-1', code: 'invalid_connection_report',
    });
  });
});
