import { describe, expect, it } from 'vitest';
import {
  VIRTUAL_OFFICE_ACTIVATION_POLICY,
  STANDARD_OFFICE_PRESET,
  adaptSaasWorkspaceCapabilities,
  createIncompleteWorkspaceFixture,
  createReadyWorkspaceFixture,
  decideVirtualOfficeActivation,
  customizeWorkspaceOffice,
  provisionWorkspaceOffice,
  resolveWorkspaceWhatsAppBinding,
  selectOfficeProvisioningReadiness,
  selectVirtualOfficeAccess,
  validateWorkspaceCapabilitySnapshot,
} from '../src/central-integrations';

const completeSaasInput = {
  workspace: {
    id: 'workspace-saas',
    whatsapp_agent_enabled: true,
    vapi_assistant_id: 'vapi-assistant-1',
    advanced_memory_enabled: true,
    cross_channel_memory_enabled: true,
    pipeline_ai_enabled: true,
    cold_lead_recovery_enabled: true,
  },
  activeWhatsappAgent: { id: 'agent-1', type: 'setter' as const, is_active: true },
  ycloudIntegration: { provider: 'ycloud' as const, enabled: true },
  ycloudHealth: { health: 'healthy' as const, checkedAt: '2026-07-14T15:00:00.000Z' },
  voiceHealth: { health: 'healthy' as const, checkedAt: '2026-07-14T15:00:00.000Z' },
  capturedAt: '2026-07-14T15:01:00.000Z',
};

describe('virtual office workspace provisioning', () => {
  it('marks a complete workspace as ready for explicit activation', () => {
    const readiness = selectOfficeProvisioningReadiness(createReadyWorkspaceFixture());

    expect(readiness).toMatchObject({
      state: 'ready_to_enable',
      requirementsMet: 7,
      requirementsTotal: 7,
      canEnable: true,
      visibleToWorkspace: false,
      accessible: false,
      blockingRequirementIds: [],
    });
  });

  it('only grants access after the explicit office flag is enabled', () => {
    const readiness = selectOfficeProvisioningReadiness(
      createReadyWorkspaceFixture({ virtualOfficeEnabled: true }),
    );

    expect(readiness.state).toBe('active');
    expect(readiness.canEnable).toBe(false);
    expect(readiness.visibleToWorkspace).toBe(true);
    expect(readiness.accessible).toBe(true);
  });

  it('reports every missing capability without leaking credentials', () => {
    const readiness = selectOfficeProvisioningReadiness(createIncompleteWorkspaceFixture());

    expect(readiness.state).toBe('not_ready');
    expect(readiness.blockingRequirementIds).toEqual([
      'ycloud',
      'voice',
      'cross_channel_memory',
      'cold_lead_recovery',
    ]);
    expect(JSON.stringify(readiness)).not.toMatch(/api[_-]?key|secret|token/i);
  });

  it('detects an office enabled before its prerequisites are ready', () => {
    const readiness = selectOfficeProvisioningReadiness({
      ...createIncompleteWorkspaceFixture(),
      virtualOfficeEnabled: true,
    });

    expect(readiness.state).toBe('misconfigured');
    expect(readiness.visibleToWorkspace).toBe(false);
    expect(readiness.accessible).toBe(false);
  });

  it('reserves activation for ONYXLINK super administration and defaults to hidden', () => {
    expect(VIRTUAL_OFFICE_ACTIVATION_POLICY).toEqual({
      activationOwner: 'onyxlink_super_admin',
      defaultEnabled: false,
      hiddenForWorkspaceWhenDisabled: true,
    });
  });

  it('rejects malformed or unknown capability fields', () => {
    const valid = createReadyWorkspaceFixture();
    expect(validateWorkspaceCapabilitySnapshot(valid).success).toBe(true);
    expect(validateWorkspaceCapabilitySnapshot({ ...valid, capturedAt: 'today' }).success).toBe(false);
    expect(validateWorkspaceCapabilitySnapshot({ ...valid, ycloudApiKey: 'must-not-exist' }).success).toBe(false);
  });

  it('maps sanitized SaaS rows without exposing integration credentials', () => {
    const snapshot = adaptSaasWorkspaceCapabilities(completeSaasInput);
    const readiness = selectOfficeProvisioningReadiness(snapshot);

    expect(snapshot).toMatchObject({
      workspaceId: 'workspace-saas',
      virtualOfficeEnabled: false,
      whatsappAgent: { activeAgentId: 'agent-1', activeAgentType: 'setter' },
      voice: { assistantId: 'vapi-assistant-1' },
    });
    expect(readiness.state).toBe('ready_to_enable');
    expect(JSON.stringify(snapshot)).not.toMatch(/credential|api[_-]?key|secret|token/i);
  });

  it('treats a missing office flag and an inactive WhatsApp row as disabled', () => {
    const snapshot = adaptSaasWorkspaceCapabilities({
      ...completeSaasInput,
      activeWhatsappAgent: { ...completeSaasInput.activeWhatsappAgent, is_active: false },
    });
    const readiness = selectOfficeProvisioningReadiness(snapshot);

    expect(snapshot.virtualOfficeEnabled).toBe(false);
    expect(snapshot.whatsappAgent.activeAgentId).toBeNull();
    expect(readiness.blockingRequirementIds).toContain('whatsapp_agent');
    expect(readiness.visibleToWorkspace).toBe(false);
  });
});

describe('virtual office administrative activation', () => {
  const superAdmin = {
    actorId: 'onyx-admin-1',
    role: 'onyxlink_super_admin' as const,
    workspaceId: null,
  };

  it('allows only an ONYXLINK super admin to enable a ready workspace', () => {
    const snapshot = createReadyWorkspaceFixture();
    const decision = decideVirtualOfficeActivation(snapshot, {
      requestId: 'request-enable-1',
      workspaceId: snapshot.workspaceId,
      action: 'enable',
      expectedEnabled: false,
      requestedAt: '2026-07-15T09:00:00.000Z',
      actor: superAdmin,
    });

    expect(decision).toMatchObject({ allowed: true, code: 'approved', nextEnabled: true });
    expect(decision.auditRecord).toMatchObject({
      actorId: 'onyx-admin-1',
      fromEnabled: false,
      toEnabled: true,
    });
  });

  it('rejects workspace admins, stale requests and cross-workspace requests', () => {
    const snapshot = createReadyWorkspaceFixture();
    const baseRequest = {
      requestId: 'request-rejected',
      workspaceId: snapshot.workspaceId,
      action: 'enable' as const,
      expectedEnabled: false,
      requestedAt: '2026-07-15T09:00:00.000Z',
      actor: { actorId: 'client-admin', role: 'workspace_admin' as const, workspaceId: snapshot.workspaceId },
    };

    expect(decideVirtualOfficeActivation(snapshot, baseRequest).code).toBe('unauthorized');
    expect(
      decideVirtualOfficeActivation(snapshot, {
        ...baseRequest,
        actor: superAdmin,
        expectedEnabled: true,
      }).code,
    ).toBe('stale_state');
    expect(
      decideVirtualOfficeActivation(snapshot, {
        ...baseRequest,
        actor: superAdmin,
        workspaceId: 'workspace-other',
      }).code,
    ).toBe('workspace_mismatch');
  });

  it('blocks activation with missing requirements but permits emergency deactivation', () => {
    const incomplete = createIncompleteWorkspaceFixture();
    const enableDecision = decideVirtualOfficeActivation(incomplete, {
      requestId: 'request-enable-incomplete',
      workspaceId: incomplete.workspaceId,
      action: 'enable',
      expectedEnabled: false,
      requestedAt: '2026-07-15T09:00:00.000Z',
      actor: superAdmin,
    });
    expect(enableDecision.code).toBe('prerequisites_not_met');

    const misconfigured = { ...incomplete, virtualOfficeEnabled: true };
    const disableDecision = decideVirtualOfficeActivation(misconfigured, {
      requestId: 'request-disable-misconfigured',
      workspaceId: misconfigured.workspaceId,
      action: 'disable',
      expectedEnabled: true,
      requestedAt: '2026-07-15T09:01:00.000Z',
      actor: superAdmin,
    });
    expect(disableDecision).toMatchObject({ allowed: true, code: 'approved', nextEnabled: false });
  });

  it('keeps client navigation hidden until an authorized workspace admin has an active office', () => {
    const disabled = createReadyWorkspaceFixture();
    const workspaceAdmin = {
      actorId: 'workspace-admin-1',
      role: 'workspace_admin' as const,
      workspaceId: disabled.workspaceId,
    };

    expect(selectVirtualOfficeAccess(disabled, workspaceAdmin).reason).toBe('office_disabled');
    expect(
      selectVirtualOfficeAccess(
        { ...disabled, virtualOfficeEnabled: true },
        workspaceAdmin,
      ),
    ).toEqual({ visible: true, accessible: true, reason: 'workspace_active' });
    expect(
      selectVirtualOfficeAccess(
        { ...disabled, virtualOfficeEnabled: true },
        { ...workspaceAdmin, role: 'workspace_member' },
      ).reason,
    ).toBe('insufficient_role');
  });
});

describe('workspace office preset', () => {
  it('provisions the same versioned seven-seat baseline for every workspace', () => {
    const office = provisionWorkspaceOffice('workspace-a', '2026-07-15T09:30:00.000Z');

    expect(office).toMatchObject({
      workspaceId: 'workspace-a',
      presetId: 'standard-virtual-office',
      presetVersion: '1.0.0',
      displayName: 'Oficina Virtual',
    });
    expect(office.seats).toHaveLength(7);
    expect(office.seats.map((seat) => seat.kind)).toEqual([
      'orchestrator',
      'whatsapp',
      'voice',
      'specialist',
      'specialist',
      'specialist',
      'specialist',
    ]);
  });

  it('customizes only the target workspace without mutating the shared preset', () => {
    const original = provisionWorkspaceOffice('workspace-a', '2026-07-15T09:30:00.000Z');
    const result = customizeWorkspaceOffice(original, {
      workspaceId: 'workspace-a',
      displayName: 'Central Comercial Acme',
      seatOverrides: [
        { agentId: 'proposal', displayLabel: 'Especialista de Presupuestos', purpose: 'Preparar ofertas B2B' },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.configuration.displayName).toBe('Central Comercial Acme');
    expect(result.configuration.seats.find((seat) => seat.agentId === 'proposal')).toMatchObject({
      displayLabel: 'Especialista de Presupuestos',
      purpose: 'Preparar ofertas B2B',
    });
    expect(original.displayName).toBe('Oficina Virtual');
    expect(STANDARD_OFFICE_PRESET.seats[3].displayLabel).toBe('Especialista 1');
  });

  it('protects fixed channel seats and rejects cross-workspace customization', () => {
    const office = provisionWorkspaceOffice('workspace-a', '2026-07-15T09:30:00.000Z');

    expect(
      customizeWorkspaceOffice(office, {
        workspaceId: 'workspace-a',
        seatOverrides: [{ agentId: 'lead-intake', displayLabel: 'Otro agente' }],
      }),
    ).toMatchObject({ success: false, code: 'protected_seat', agentId: 'lead-intake' });
    expect(
      customizeWorkspaceOffice(office, { workspaceId: 'workspace-b', displayName: 'No permitido' }),
    ).toEqual({ success: false, code: 'workspace_mismatch' });
  });
});

describe('workspace WhatsApp binding', () => {
  const connection = {
    workspaceId: 'workspace-ready',
    connectionId: 'ycloud-connection-1',
    provider: 'ycloud' as const,
    phoneNumber: '+34 611 234 567',
    health: 'healthy' as const,
  };

  it('binds the WhatsApp desk to the active agent and masks the client number', () => {
    const binding = resolveWorkspaceWhatsAppBinding(createReadyWorkspaceFixture(), connection);

    expect(binding).toEqual({
      workspaceId: 'workspace-ready',
      officeAgentId: 'lead-intake',
      state: 'ready',
      connectionId: 'ycloud-connection-1',
      provider: 'ycloud',
      phoneNumberMasked: '*** *** 4567',
      activeAgentId: 'agent-setter-1',
      activeAgentType: 'setter',
    });
    expect(JSON.stringify(binding)).not.toContain('+34 611 234 567');
  });

  it('rejects a YCloud connection belonging to another workspace', () => {
    const binding = resolveWorkspaceWhatsAppBinding(createReadyWorkspaceFixture(), {
      ...connection,
      workspaceId: 'workspace-other',
    });

    expect(binding).toMatchObject({
      state: 'workspace_mismatch',
      connectionId: null,
      phoneNumberMasked: null,
      activeAgentId: null,
    });
  });

  it('reports disconnected, unhealthy and inactive-agent states independently', () => {
    const ready = createReadyWorkspaceFixture();

    expect(resolveWorkspaceWhatsAppBinding(ready, null).state).toBe('not_connected');
    expect(
      resolveWorkspaceWhatsAppBinding(ready, { ...connection, health: 'error' }).state,
    ).toBe('integration_unhealthy');
    expect(
      resolveWorkspaceWhatsAppBinding(
        { ...ready, whatsappAgent: { enabled: false, activeAgentId: null, activeAgentType: null } },
        connection,
      ).state,
    ).toBe('agent_inactive');
  });

  it('updates the masked number from the current connection without reprovisioning', () => {
    const snapshot = createReadyWorkspaceFixture();
    const first = resolveWorkspaceWhatsAppBinding(snapshot, connection);
    const changed = resolveWorkspaceWhatsAppBinding(snapshot, {
      ...connection,
      connectionId: 'ycloud-connection-2',
      phoneNumber: '+34 699 000 123',
    });

    expect(first.phoneNumberMasked).toBe('*** *** 4567');
    expect(changed).toMatchObject({
      connectionId: 'ycloud-connection-2',
      phoneNumberMasked: '*** *** 0123',
      officeAgentId: first.officeAgentId,
    });
  });
});
