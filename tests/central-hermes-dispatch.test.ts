import { describe, expect, it } from 'vitest';
import { provisionWorkspaceOffice } from '../src/central-integrations';
import {
  applyOfficeConfigurationCommand,
  createOfficeConfigurationState,
} from '../src/central-integrations/configuration';
import type { OfficeConfigurationDocument } from '../src/central-integrations/configuration';
import {
  acceptHermesSpecialistDispatch,
  handleHermesBridgeRequest,
  materializeHermesDispatchTask,
  resolveHermesDispatchBinding,
} from '../src/central-orchestration';
import type { WorkspaceOrchestratorBinding } from '../src/central-orchestrator';
import { createCentralTaskState } from '../src/central-tasks';

const WORKSPACE_ID = 'workspace-demo';
const NOW = '2026-07-16T10:00:00.000Z';
const ACTOR = {
  actorId: 'super-admin',
  role: 'onyxlink_super_admin' as const,
  workspaceId: WORKSPACE_ID,
};

function publishedConfiguration(): OfficeConfigurationDocument {
  const provisioned = provisionWorkspaceOffice(WORKSPACE_ID, NOW);
  const state = createOfficeConfigurationState(provisioned, ACTOR.actorId, NOW);
  const result = applyOfficeConfigurationCommand(state, {
    type: 'publish',
    workspaceId: WORKSPACE_ID,
    expectedRevision: state.current.revision,
    actor: ACTOR,
    occurredAt: NOW,
  });
  if (!result.success) throw new Error(result.code);
  return result.state.current;
}

function dispatch(overrides: Record<string, unknown> = {}) {
  return {
    dispatchId: 'dispatch-1',
    workspaceId: WORKSPACE_ID,
    connectionId: 'hermes-onyxlink',
    conversationId: 'telegram-thread-42',
    targetAgentId: 'proposal',
    title: 'Preparar propuesta comercial',
    instructions: 'Construye una propuesta a partir del briefing validado.',
    requestedActions: ['read_contacts', 'read_memory', 'create_task'],
    priority: 'high',
    contactId: 'contact-42',
    requiresHumanApproval: false,
    occurredAt: NOW,
    ...overrides,
  };
}

const binding = { connectionId: 'hermes-onyxlink', workspaceId: WORKSPACE_ID, enabled: true };

function bridgeRequest(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'bridge-request-1',
    authenticatedConnectionId: 'hermes-onyxlink',
    receivedAt: NOW,
    dispatch: dispatch(),
    ...overrides,
  };
}

function orchestratorBinding(overrides: Partial<WorkspaceOrchestratorBinding> = {}): WorkspaceOrchestratorBinding {
  return {
    workspaceId: WORKSPACE_ID,
    activeMode: 'hermes_telegram',
    revision: 4,
    openrouter: {
      mode: 'openrouter',
      model: null,
      status: 'not_configured',
      hasApiKey: false,
      statusDetail: null,
      updatedAt: NOW,
      updatedBy: 'system',
    },
    hermesTelegram: {
      mode: 'hermes_telegram',
      endpoint: 'https://bridge.onyxlink.example/hermes',
      connectionId: 'hermes-onyxlink',
      botId: '@onyxlink_bot',
      status: 'connected',
      hasSecret: true,
      statusDetail: null,
      updatedAt: NOW,
      updatedBy: 'system',
    },
    ...overrides,
  };
}

describe('Hermes to specialist dispatch boundary', () => {
  it('normalizes a backend bridge request into an accepted response', () => {
    const result = handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      bridgeRequest(),
    );
    expect(result).toMatchObject({
      status: 'accepted',
      requestId: 'bridge-request-1',
      receipt: {
        dispatchId: 'dispatch-1',
        commandChannel: 'telegram_private',
        taskId: 'hermes-dispatch-task:dispatch-1',
      },
      task: { assignedAgentId: 'proposal' },
    });
  });

  it('normalizes Hermes retries as duplicate bridge responses', () => {
    const first = handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      bridgeRequest(),
    );
    if (first.status === 'rejected') throw new Error(first.code);

    const retry = handleHermesBridgeRequest(
      first.state,
      publishedConfiguration(),
      orchestratorBinding(),
      bridgeRequest(),
    );
    expect(retry).toMatchObject({
      status: 'duplicate',
      requestId: 'bridge-request-1',
      receipt: { taskId: 'hermes-dispatch-task:dispatch-1' },
    });
    if (retry.status !== 'rejected') expect(Object.keys(retry.state.tasks)).toHaveLength(1);
  });

  it('preserves Telegram group and voice command channels in bridge receipts', () => {
    const group = handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      bridgeRequest({
        requestId: 'bridge-request-group',
        dispatch: dispatch({
          commandChannel: 'telegram_group',
          conversationId: 'telegram-group:onyxlink-direccion',
        }),
      }),
    );
    expect(group).toMatchObject({
      status: 'accepted',
      receipt: {
        commandChannel: 'telegram_group',
        conversationId: 'telegram-group:onyxlink-direccion',
      },
    });

    const voice = handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      bridgeRequest({
        requestId: 'bridge-request-voice',
        dispatch: dispatch({
          commandChannel: 'voice',
          conversationId: 'voice-command:luis:2026-07-16T10:00:00.000Z',
        }),
      }),
    );
    expect(voice).toMatchObject({
      status: 'accepted',
      receipt: { commandChannel: 'voice', targetAgentId: 'proposal' },
      task: { assignedAgentId: 'proposal' },
    });
  });

  it('rejects bridge requests with invalid envelopes, dispatches or forged backend authentication', () => {
    expect(handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      { ...bridgeRequest(), receivedAt: '' },
    )).toMatchObject({ status: 'rejected', requestId: 'bridge-request-1', code: 'invalid_bridge_request' });

    expect(handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      { ...bridgeRequest(), dispatch: { ...dispatch(), commandChannel: 'sms' } },
    )).toMatchObject({ status: 'rejected', requestId: 'bridge-request-1', code: 'invalid_dispatch' });

    expect(handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      { ...bridgeRequest(), authenticatedConnectionId: 'forged' },
    )).toEqual({ status: 'rejected', requestId: 'bridge-request-1', code: 'connection_mismatch' });
  });

  it('returns clear bridge rejections for workspace mismatch and invalid dispatch payloads', () => {
    expect(handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding({ workspaceId: 'workspace-other' }),
      bridgeRequest(),
    )).toEqual({ status: 'rejected', requestId: 'bridge-request-1', code: 'workspace_mismatch' });

    expect(handleHermesBridgeRequest(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      bridgeRequest({ dispatch: dispatch({ instructions: '' }) }),
    )).toMatchObject({
      status: 'rejected',
      requestId: 'bridge-request-1',
      code: 'invalid_dispatch',
    });
  });

  it('accepts a bridge dispatch by resolving Hermes mode, authenticating the envelope and creating a task', () => {
    const result = acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch(),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.task).toMatchObject({
      id: 'hermes-dispatch-task:dispatch-1',
      assignedAgentId: 'proposal',
      source: 'automation',
      requiresApproval: false,
    });
    expect(result.receipt).toMatchObject({
      status: 'accepted',
      commandChannel: 'telegram_private',
      taskId: 'hermes-dispatch-task:dispatch-1',
      targetAgentId: 'proposal',
    });
  });

  it('accepts Hermes orders from a Telegram group with the bot included', () => {
    const result = acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch({
        commandChannel: 'telegram_group',
        conversationId: 'telegram-group:onyxlink-direccion',
      }),
    );
    expect(result).toMatchObject({
      success: true,
      receipt: {
        commandChannel: 'telegram_group',
        conversationId: 'telegram-group:onyxlink-direccion',
      },
    });
  });

  it('accepts Hermes orders from voice command channels without treating Voice as the task destination', () => {
    const result = acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch({
        commandChannel: 'voice',
        conversationId: 'voice-command:luis:2026-07-16T10:00:00.000Z',
      }),
    );
    expect(result).toMatchObject({
      success: true,
      task: { assignedAgentId: 'proposal' },
      receipt: {
        commandChannel: 'voice',
        targetAgentId: 'proposal',
      },
    });
  });

  it('keeps the bridge handler idempotent across Hermes retries', () => {
    const first = acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch(),
    );
    if (!first.success) throw new Error(first.code);

    const retry = acceptHermesSpecialistDispatch(
      first.state,
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch(),
    );
    expect(retry).toMatchObject({ success: true, duplicate: true });
    if (retry.success) expect(Object.keys(retry.state.tasks)).toHaveLength(1);
  });

  it('blocks bridge dispatches before task creation when Hermes is not the active connected mode', () => {
    expect(acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding({ activeMode: 'openrouter' }),
      dispatch(),
    )).toEqual({ success: false, code: 'orchestrator_not_hermes' });

    expect(acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding({
        hermesTelegram: { ...orchestratorBinding().hermesTelegram, connectionId: null },
      }),
      dispatch(),
    )).toEqual({ success: false, code: 'hermes_connection_missing' });
  });

  it('propagates dispatch, office configuration and policy rejections from the secure bridge boundary', () => {
    const draft = { ...publishedConfiguration(), status: 'draft' as const };
    expect(acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      draft,
      orchestratorBinding(),
      dispatch(),
    )).toEqual({ success: false, code: 'configuration_not_published' });

    expect(acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch({ instructions: '' }),
    )).toMatchObject({ success: false, code: 'invalid_dispatch' });

    expect(acceptHermesSpecialistDispatch(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      orchestratorBinding(),
      dispatch({ requestedActions: ['send_message'] }),
    )).toEqual({ success: false, code: 'action_not_allowed' });
  });

  it('derives the dispatch binding from the active Hermes orchestrator configuration', () => {
    const result = resolveHermesDispatchBinding(orchestratorBinding(), WORKSPACE_ID);
    expect(result).toEqual({
      success: true,
      binding: {
        connectionId: 'hermes-onyxlink',
        workspaceId: WORKSPACE_ID,
        enabled: true,
      },
    });
  });

  it('keeps incomplete or inactive Hermes configuration from authenticating dispatches', () => {
    expect(resolveHermesDispatchBinding(orchestratorBinding({ activeMode: 'openrouter' }), WORKSPACE_ID))
      .toEqual({ success: false, code: 'orchestrator_not_hermes' });
    expect(resolveHermesDispatchBinding(orchestratorBinding({
      hermesTelegram: { ...orchestratorBinding().hermesTelegram, status: 'pending' },
    }), WORKSPACE_ID)).toEqual({ success: false, code: 'hermes_not_connected' });
    expect(resolveHermesDispatchBinding(orchestratorBinding({
      hermesTelegram: { ...orchestratorBinding().hermesTelegram, hasSecret: false },
    }), WORKSPACE_ID)).toEqual({ success: false, code: 'hermes_secret_missing' });
    expect(resolveHermesDispatchBinding(orchestratorBinding({
      hermesTelegram: { ...orchestratorBinding().hermesTelegram, endpoint: null },
    }), WORKSPACE_ID)).toEqual({ success: false, code: 'hermes_endpoint_missing' });
    expect(resolveHermesDispatchBinding(orchestratorBinding({
      hermesTelegram: { ...orchestratorBinding().hermesTelegram, connectionId: null },
    }), WORKSPACE_ID)).toEqual({ success: false, code: 'hermes_connection_missing' });
    expect(resolveHermesDispatchBinding(orchestratorBinding({ workspaceId: 'workspace-other' }), WORKSPACE_ID))
      .toEqual({ success: false, code: 'workspace_mismatch' });
  });

  it('materializes an authenticated Hermes order as one specialist task', () => {
    const result = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      binding,
      dispatch(),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.task).toMatchObject({
      id: 'hermes-dispatch-task:dispatch-1',
      workspaceId: WORKSPACE_ID,
      assignedAgentId: 'proposal',
      source: 'automation',
      priority: 'high',
    });
    expect(result.receipt).toMatchObject({
      dispatchId: 'dispatch-1',
      commandChannel: 'telegram_private',
      conversationId: 'telegram-thread-42',
      approvalRequired: false,
    });
  });

  it('is idempotent when Telegram or Hermes retries the same dispatch', () => {
    const first = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), publishedConfiguration(), binding, dispatch(),
    );
    if (!first.success) throw new Error(first.code);
    const retry = materializeHermesDispatchTask(first.state, publishedConfiguration(), binding, dispatch());
    expect(retry).toMatchObject({ success: true, duplicate: true });
    if (retry.success) expect(Object.keys(retry.state.tasks)).toHaveLength(1);
  });

  it('rejects a dispatch authenticated for another workspace', () => {
    const result = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID),
      publishedConfiguration(),
      { ...binding, workspaceId: 'workspace-other' },
      dispatch(),
    );
    expect(result).toEqual({ success: false, code: 'workspace_mismatch' });
  });

  it('rejects an unknown or disabled Hermes connection', () => {
    expect(materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), publishedConfiguration(), { ...binding, enabled: false }, dispatch(),
    )).toEqual({ success: false, code: 'connection_disabled' });
    expect(materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), publishedConfiguration(), binding, dispatch({ connectionId: 'forged' }),
    )).toEqual({ success: false, code: 'connection_mismatch' });
  });

  it('rejects protected seats and actions outside the specialist policy', () => {
    const protectedSeat = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), publishedConfiguration(), binding, dispatch({ targetAgentId: 'lead-intake' }),
    );
    expect(protectedSeat).toMatchObject({ success: false, code: 'invalid_dispatch' });

    const forbiddenAction = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), publishedConfiguration(), binding, dispatch({ requestedActions: ['send_message'] }),
    );
    expect(forbiddenAction).toEqual({ success: false, code: 'action_not_allowed' });
  });

  it('requires approval for sensitive actions according to the specialist policy', () => {
    const configuration = publishedConfiguration();
    configuration.specialists.proposal.allowedActions = [
      ...configuration.specialists.proposal.allowedActions,
      'update_pipeline',
    ];
    const result = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), configuration, binding, dispatch({ requestedActions: ['update_pipeline'] }),
    );
    expect(result).toMatchObject({
      success: true,
      task: { requiresApproval: true, approvalStatus: 'pending' },
      receipt: { approvalRequired: true },
    });
  });

  it('requires a published office configuration and validates the envelope', () => {
    const draft = { ...publishedConfiguration(), status: 'draft' as const };
    expect(materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), draft, binding, dispatch(),
    )).toEqual({ success: false, code: 'configuration_not_published' });

    const malformed = materializeHermesDispatchTask(
      createCentralTaskState(WORKSPACE_ID), publishedConfiguration(), binding, dispatch({ instructions: '' }),
    );
    expect(malformed).toMatchObject({ success: false, code: 'invalid_dispatch' });
  });
});
