import { describe, expect, it } from 'vitest';
import {
  applyOfficeConfigurationCommand,
  createOfficeConfigurationState,
  provisionWorkspaceOffice,
  selectOfficeAgentPromptOwnership,
  validateOfficeConfiguration,
} from '../src/central-integrations';

const superAdmin = {
  actorId: 'onyx-admin-1',
  role: 'onyxlink_super_admin' as const,
  workspaceId: null,
};

function createState() {
  return createOfficeConfigurationState(
    provisionWorkspaceOffice('workspace-onyxlink', '2026-07-15T10:00:00.000Z'),
    superAdmin.actorId,
    '2026-07-15T10:00:00.000Z',
  );
}

describe('office template configuration', () => {
  it('keeps WhatsApp and voice prompts in their existing source of truth', () => {
    expect(selectOfficeAgentPromptOwnership('lead-intake')).toEqual({
      agentId: 'lead-intake',
      source: 'whatsapp_panel',
      editableInOffice: false,
      externalReferenceField: 'activeWhatsappAgentId',
    });
    expect(selectOfficeAgentPromptOwnership('strategy')).toEqual({
      agentId: 'strategy',
      source: 'vapi',
      editableInOffice: false,
      externalReferenceField: 'vapiAssistantId',
    });
    expect(selectOfficeAgentPromptOwnership('proposal').source).toBe('office_configuration');
  });

  it('creates a valid draft from the versioned workspace preset', () => {
    const state = createState();

    expect(state.current).toMatchObject({
      workspaceId: 'workspace-onyxlink',
      presetId: 'standard-virtual-office',
      presetVersion: '1.0.0',
      revision: 1,
      status: 'draft',
      officeDisplayName: 'Oficina Virtual',
    });
    expect(Object.keys(state.current.specialists)).toHaveLength(4);
    expect(validateOfficeConfiguration(state.current)).toEqual([]);
  });

  it('updates a specialist and records an immutable workspace revision', () => {
    const original = createState();
    const result = applyOfficeConfigurationCommand(original, {
      type: 'update_specialist',
      workspaceId: 'workspace-onyxlink',
      expectedRevision: 1,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:05:00.000Z',
      agentId: 'proposal',
      patch: {
        name: 'Especialista de Propuestas',
        function: 'Preparar propuestas comerciales',
        objective: 'Aumentar la conversión de oportunidades cualificadas.',
        instructions: 'Redacta un borrador y solicita aprobación antes de enviarlo.',
        allowedActions: ['read_contacts', 'read_memory', 'draft_message', 'request_handoff'],
        approvalPolicy: 'always',
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.current).toMatchObject({ revision: 2, status: 'draft' });
    expect(result.state.current.specialists.proposal).toMatchObject({
      name: 'Especialista de Propuestas',
      approvalPolicy: 'always',
    });
    expect(result.state.history.at(-1)).toMatchObject({
      revision: 2,
      action: 'specialist_updated',
      actorId: 'onyx-admin-1',
    });
    expect(original.current.specialists.proposal.name).toBe('Especialista 1');
  });

  it('rejects unauthorized, cross-workspace and stale changes', () => {
    const state = createState();
    const command = {
      type: 'update_office' as const,
      workspaceId: 'workspace-onyxlink',
      expectedRevision: 1,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:05:00.000Z',
      displayName: 'Central ONYXLINK',
    };

    expect(
      applyOfficeConfigurationCommand(state, {
        ...command,
        actor: { actorId: 'client-admin', role: 'workspace_admin', workspaceId: 'workspace-onyxlink' },
      }),
    ).toEqual({ success: false, code: 'unauthorized' });
    expect(
      applyOfficeConfigurationCommand(state, { ...command, workspaceId: 'workspace-other' }),
    ).toEqual({ success: false, code: 'workspace_mismatch' });
    expect(
      applyOfficeConfigurationCommand(state, { ...command, expectedRevision: 0 }),
    ).toEqual({ success: false, code: 'stale_revision' });
  });

  it('protects fixed seats and validates specialist fields and actions', () => {
    const state = createState();

    expect(
      applyOfficeConfigurationCommand(state, {
        type: 'reset_specialist',
        workspaceId: state.current.workspaceId,
        expectedRevision: 1,
        actor: superAdmin,
        occurredAt: '2026-07-15T10:05:00.000Z',
        agentId: 'lead-intake',
      }),
    ).toEqual({ success: false, code: 'protected_seat' });

    const invalid = applyOfficeConfigurationCommand(state, {
      type: 'update_specialist',
      workspaceId: state.current.workspaceId,
      expectedRevision: 1,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:06:00.000Z',
      agentId: 'proposal',
      patch: { name: ' ', allowedActions: [] },
    });
    expect(invalid).toMatchObject({ success: false, code: 'invalid_configuration' });
  });

  it('publishes, resets and restores without losing audit history', () => {
    const initial = createState();
    const updated = applyOfficeConfigurationCommand(initial, {
      type: 'update_specialist',
      workspaceId: initial.current.workspaceId,
      expectedRevision: 1,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:05:00.000Z',
      agentId: 'operations',
      patch: { name: 'Automatización' },
    });
    if (!updated.success) throw new Error('Expected update to succeed');

    const published = applyOfficeConfigurationCommand(updated.state, {
      type: 'publish',
      workspaceId: updated.state.current.workspaceId,
      expectedRevision: 2,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:06:00.000Z',
    });
    if (!published.success) throw new Error('Expected publish to succeed');
    expect(published.state.current).toMatchObject({ revision: 3, status: 'published' });

    const reset = applyOfficeConfigurationCommand(published.state, {
      type: 'reset_specialist',
      workspaceId: published.state.current.workspaceId,
      expectedRevision: 3,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:06:30.000Z',
      agentId: 'operations',
    });
    if (!reset.success) throw new Error('Expected reset to succeed');
    expect(reset.state.current.specialists.operations.name).toBe('Especialista 2');
    expect(reset.state.history.at(-1)?.action).toBe('specialist_reset');

    const restored = applyOfficeConfigurationCommand(reset.state, {
      type: 'restore_revision',
      workspaceId: reset.state.current.workspaceId,
      expectedRevision: 4,
      actor: superAdmin,
      occurredAt: '2026-07-15T10:07:00.000Z',
      revision: 2,
    });
    if (!restored.success) throw new Error('Expected restore to succeed');
    expect(restored.state.current).toMatchObject({ revision: 5, status: 'draft' });
    expect(restored.state.current.specialists.operations.name).toBe('Automatización');
    expect(restored.state.history.at(-1)).toMatchObject({
      action: 'revision_restored',
      sourceRevision: 2,
    });
  });
});
