import { describe, expect, it } from 'vitest';
import type { WorkspaceOrchestratorBinding } from '../src/central-orchestrator';
import {
  applyVoiceOutboundCommand,
  buildVapiAppointmentReminderRequest,
  createVoiceOutboundState,
  queueHermesAppointmentReminder,
  recordVoiceProviderResult,
  selectVoiceOutboundReadiness,
} from '../src/central-voice-outbound';
import type {
  AppointmentCallSnapshot,
  QueueAppointmentReminderContext,
  VoiceOutboundState,
} from '../src/central-voice-outbound';

const WORKSPACE_ID = 'workspace-demo';
const NOW = '2026-07-16T10:00:00.000Z';

function hermesBinding(overrides: Partial<WorkspaceOrchestratorBinding> = {}): WorkspaceOrchestratorBinding {
  return {
    workspaceId: WORKSPACE_ID,
    activeMode: 'hermes_telegram',
    revision: 4,
    openrouter: {
      mode: 'openrouter', model: null, status: 'not_configured', hasApiKey: false,
      statusDetail: null, updatedAt: NOW, updatedBy: 'system',
    },
    hermesTelegram: {
      mode: 'hermes_telegram', endpoint: 'https://bridge.example.test/hermes', botId: '@hermes_test_bot',
      connectionId: 'hermes-voice-test',
      status: 'connected', hasSecret: true, statusDetail: null, updatedAt: NOW, updatedBy: 'system',
    },
    ...overrides,
  };
}

function readyVoiceState(): VoiceOutboundState {
  let state = createVoiceOutboundState(WORKSPACE_ID);
  const policy = applyVoiceOutboundCommand(state, {
    type: 'voice_outbound.policy_updated',
    commandId: 'voice-policy-1',
    workspaceId: WORKSPACE_ID,
    expectedRevision: state.revision,
    actor: { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID },
    occurredAt: NOW,
    policy: {
      enabled: true,
      allowedPurposes: ['appointment_reminder'],
      allowedRequesterRoles: ['workspace_owner'],
      authorizedPrincipalIds: ['owner-luis', 'owner-socio'],
      timeZone: 'Europe/Madrid',
      callingWindow: { startHour: 9, endHour: 20 },
      maxAttempts: 1,
    },
  });
  if (!policy.success) throw new Error(policy.code);
  state = policy.state;
  const binding = applyVoiceOutboundCommand(state, {
    type: 'voice_outbound.vapi_binding_reported',
    commandId: 'voice-binding-1',
    workspaceId: WORKSPACE_ID,
    expectedRevision: state.revision,
    actor: { actorId: 'voice-backend', role: 'system', workspaceId: WORKSPACE_ID },
    occurredAt: NOW,
    binding: {
      assistantId: 'vapi-assistant-1',
      phoneNumberId: 'vapi-phone-1',
      hasApiKey: true,
      status: 'ready',
      statusDetail: null,
      checkedAt: NOW,
    },
  });
  if (!binding.success) throw new Error(binding.code);
  return binding.state;
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'reminder-request-1',
    workspaceId: WORKSPACE_ID,
    telegramConversationId: 'telegram-command-42',
    contactId: 'contact-pepito',
    appointmentId: 'appointment-1',
    occurredAt: NOW,
    ...overrides,
  };
}

function appointment(overrides: Partial<AppointmentCallSnapshot> = {}): AppointmentCallSnapshot {
  return {
    workspaceId: WORKSPACE_ID,
    contactId: 'contact-pepito',
    appointmentId: 'appointment-1',
    contactDisplayName: 'Pepito Patas Largas',
    phoneE164: '+34600111222',
    appointmentAt: '2026-07-17T09:00:00.000Z',
    consent: {
      outboundVoiceAllowed: true,
      capturedAt: '2026-07-10T08:00:00.000Z',
      source: 'appointment_booking',
    },
    ...overrides,
  };
}

function context(overrides: Partial<QueueAppointmentReminderContext> = {}): QueueAppointmentReminderContext {
  return {
    orchestrator: hermesBinding(),
    principal: {
      principalId: 'owner-luis',
      workspaceId: WORKSPACE_ID,
      role: 'workspace_owner',
      telegramIdentityVerified: true,
    },
    appointment: appointment(),
    ...overrides,
  };
}

describe('preauthorized outbound appointment reminders', () => {
  it('stays blocked until Vapi assistant, number and server credential are ready', () => {
    const readiness = selectVoiceOutboundReadiness(createVoiceOutboundState(WORKSPACE_ID));
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toEqual(expect.arrayContaining([
      'policy_disabled',
      'vapi_api_key_missing',
      'vapi_assistant_missing',
      'vapi_phone_number_missing',
      'vapi_not_ready',
    ]));
  });

  it('queues one reminder requested by an allowlisted verified workspace owner', () => {
    const result = queueHermesAppointmentReminder(readyVoiceState(), request(), context());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.job).toMatchObject({
      status: 'queued',
      purpose: 'appointment_reminder',
      requestedByPrincipalId: 'owner-luis',
      customerNumber: '+34600111222',
      maxAttempts: 1,
    });
  });

  it('builds a Vapi server request with trusted variables and no credential', () => {
    const queued = queueHermesAppointmentReminder(readyVoiceState(), request(), context());
    if (!queued.success) throw new Error(queued.code);
    const payload = buildVapiAppointmentReminderRequest(queued.job);
    expect(payload).toMatchObject({
      assistantId: 'vapi-assistant-1',
      phoneNumberId: 'vapi-phone-1',
      customer: { number: '+34600111222', name: 'Pepito Patas Largas' },
      assistantOverrides: { variableValues: { purpose: 'appointment_reminder', appointmentId: 'appointment-1' } },
      metadata: { workspaceId: WORKSPACE_ID, voiceJobId: queued.job.id },
    });
    expect(JSON.stringify(payload)).not.toMatch(/apiKey|token|secret|authorization/i);
  });

  it('never accepts automatic requests outside Hermes mode', () => {
    const openRouter = hermesBinding({ activeMode: 'openrouter' });
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ orchestrator: openRouter }),
    )).toEqual({ success: false, code: 'orchestrator_not_hermes' });
  });

  it('rejects unverified, non-owner and non-allowlisted Telegram principals', () => {
    const base = context();
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ principal: { ...base.principal, telegramIdentityVerified: false } }),
    )).toEqual({ success: false, code: 'identity_not_verified' });
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ principal: { ...base.principal, role: 'workspace_admin' } }),
    )).toEqual({ success: false, code: 'requester_not_authorized' });
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ principal: { ...base.principal, principalId: 'owner-other' } }),
    )).toEqual({ success: false, code: 'requester_not_authorized' });
  });

  it('resolves phone and consent from trusted workspace data', () => {
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ appointment: appointment({ contactId: 'different-contact' }) }),
    )).toEqual({ success: false, code: 'contact_mismatch' });
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ appointment: appointment({ consent: { outboundVoiceAllowed: false, capturedAt: null, source: null } }) }),
    )).toEqual({ success: false, code: 'consent_required' });
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ appointment: appointment({ phoneE164: '600111222' }) }),
    )).toEqual({ success: false, code: 'invalid_phone_number' });
  });

  it('enforces future appointments and the configured local calling window', () => {
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request(), context({ appointment: appointment({ appointmentAt: '2026-07-15T09:00:00.000Z' }) }),
    )).toEqual({ success: false, code: 'appointment_not_in_future' });
    expect(queueHermesAppointmentReminder(
      readyVoiceState(), request({ occurredAt: '2026-07-16T22:00:00.000Z' }), context(),
    )).toEqual({ success: false, code: 'outside_calling_window' });
  });

  it('is idempotent when the same Telegram command is delivered twice', () => {
    const first = queueHermesAppointmentReminder(readyVoiceState(), request(), context());
    if (!first.success) throw new Error(first.code);
    const retry = queueHermesAppointmentReminder(first.state, request(), context());
    expect(retry).toMatchObject({ success: true, duplicate: true, job: { id: first.job.id } });
    if (retry.success) expect(Object.keys(retry.state.jobs)).toHaveLength(1);
  });

  it('records Vapi results once and isolates provider events by workspace', () => {
    const queued = queueHermesAppointmentReminder(readyVoiceState(), request(), context());
    if (!queued.success) throw new Error(queued.code);
    const event = {
      eventId: 'vapi-event-1',
      workspaceId: WORKSPACE_ID,
      jobId: queued.job.id,
      providerCallId: 'vapi-call-1',
      status: 'completed',
      occurredAt: '2026-07-16T10:03:00.000Z',
      summary: 'Cita confirmada.',
    };
    const completed = recordVoiceProviderResult(queued.state, event);
    expect(completed).toMatchObject({
      success: true,
      duplicate: false,
      job: { status: 'completed', resultSummary: 'Cita confirmada.' },
    });
    if (!completed.success) return;
    expect(recordVoiceProviderResult(completed.state, event)).toMatchObject({ success: true, duplicate: true });
    expect(recordVoiceProviderResult(completed.state, { ...event, eventId: 'other', workspaceId: 'workspace-other' }))
      .toEqual({ success: false, code: 'workspace_mismatch' });
  });

  it('rejects credentials smuggled into configuration commands', () => {
    const state = createVoiceOutboundState(WORKSPACE_ID);
    const result = applyVoiceOutboundCommand(state, {
      type: 'voice_outbound.vapi_binding_reported',
      commandId: 'bad-binding',
      workspaceId: WORKSPACE_ID,
      expectedRevision: state.revision,
      actor: { actorId: 'system', role: 'system', workspaceId: WORKSPACE_ID },
      occurredAt: NOW,
      binding: {
        assistantId: 'assistant', phoneNumberId: 'phone', hasApiKey: true,
        status: 'ready', statusDetail: null, checkedAt: NOW,
        apiKey: 'must-not-enter-the-contract',
      },
    });
    expect(result).toMatchObject({ success: false, code: 'invalid_binding' });
  });
});
