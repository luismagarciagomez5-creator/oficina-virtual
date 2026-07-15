import { describe, expect, it } from 'vitest';
import {
  OFFICE_SEAT_BINDINGS,
  adaptVoiceActivity,
  adaptWhatsAppActivity,
  defaultAgentForSource,
  selectConfigurableOfficeSeats,
} from '../src/central-events';

describe('office seats aligned with the ONYXLINK SaaS', () => {
  it('reserves distinct seats for the existing WhatsApp and voice runtimes', () => {
    expect(OFFICE_SEAT_BINDINGS['lead-intake']).toMatchObject({
      role: 'whatsapp',
      saasBacking: 'whatsapp-active-agent',
      backendReady: true,
    });
    expect(OFFICE_SEAT_BINDINGS.strategy).toMatchObject({
      role: 'voice',
      saasBacking: 'vapi-assistant',
      backendReady: true,
    });
    expect(defaultAgentForSource('whatsapp')).not.toBe(defaultAgentForSource('voice'));
  });

  it('keeps exactly four specialist seats configurable for future capabilities', () => {
    expect(selectConfigurableOfficeSeats().map((seat) => seat.agentId)).toEqual([
      'proposal',
      'operations',
      'content',
      'review-qa',
    ]);
  });

  it('routes channel events to their dedicated seats by default', () => {
    const base = {
      workspaceId: 'workspace-1',
      occurredAt: '2026-07-14T12:00:00.000Z',
    };
    const whatsapp = adaptWhatsAppActivity({
      ...base,
      eventId: 'wa-1',
      conversationId: 'conversation-1',
      phase: 'processing',
    });
    const voice = adaptVoiceActivity({
      ...base,
      eventId: 'voice-1',
      callId: 'call-1',
      phase: 'connected',
    });

    expect(whatsapp.agentId).toBe('lead-intake');
    expect(voice.agentId).toBe('strategy');
  });
});
