import { describe, expect, it } from 'vitest';
import { provisionWorkspaceOffice } from '../src/central-integrations';
import {
  applyOfficeConfigurationCommand,
  createOfficeConfigurationState,
} from '../src/central-integrations/configuration';
import type { OfficeConfigurationDocument } from '../src/central-integrations/configuration';
import { materializeHermesDispatchTask } from '../src/central-orchestration';
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

describe('Hermes to specialist dispatch boundary', () => {
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
