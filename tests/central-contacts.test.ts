import { describe, expect, it } from 'vitest';
import {
  adaptSaasContact360,
  createSaasContact360Fixture,
  maskEmail,
  maskPhone,
  selectContact360List,
  selectCrossChannelContacts,
} from '../src/central-contacts';

describe('multichannel Contact 360', () => {
  it('projects WhatsApp, voice, memory and pipeline into one contact', () => {
    const result = adaptSaasContact360(createSaasContact360Fixture());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.contact).toMatchObject({
      contactId: 'contact-lucia',
      channels: ['whatsapp', 'voice'],
      phoneMasked: '+34 *** *** 421',
      emailMasked: 'l***@clinica.example',
      pendingTasks: 1,
      nextAction: 'Enviar propuesta y agendar demostración.',
    });
    expect(result.contact.memory?.itemCount).toBe(4);
    expect(result.contact.deal?.stage).toBe('contacted');
  });

  it('rejects rows that cross workspace or contact boundaries', () => {
    const fixture = createSaasContact360Fixture();
    expect(
      adaptSaasContact360({
        ...fixture,
        lastVoiceCall: fixture.lastVoiceCall && { ...fixture.lastVoiceCall, workspace_id: 'other-workspace' },
      }),
    ).toEqual({ success: false, error: 'workspace_mismatch' });
    expect(
      adaptSaasContact360({
        ...fixture,
        memory: fixture.memory && { ...fixture.memory, contact_id: 'other-contact' },
      }),
    ).toEqual({ success: false, error: 'contact_mismatch' });
  });

  it('masks contact data before it reaches office views', () => {
    expect(maskPhone('+34600123421')).toBe('+34 *** *** 421');
    expect(maskEmail('lucia@clinica.example')).toBe('l***@clinica.example');
  });

  it('filters and orders contacts without searching raw PII', () => {
    const result = adaptSaasContact360(createSaasContact360Fixture());
    if (!result.success) throw new Error('fixture should be valid');

    expect(selectContact360List([result.contact], { channel: 'voice', query: 'clínica' })).toHaveLength(1);
    expect(selectContact360List([result.contact], { stage: 'lost' })).toHaveLength(0);
    expect(selectContact360List([result.contact], { attentionOnly: true })).toHaveLength(1);
    expect(selectCrossChannelContacts([result.contact])).toHaveLength(1);
  });

  it('flags handoffs and failed WhatsApp messages for attention', () => {
    const fixture = createSaasContact360Fixture();
    const result = adaptSaasContact360({
      ...fixture,
      conversation: fixture.conversation && { ...fixture.conversation, state: 'handoff_pending' },
      lastMessage: fixture.lastMessage && { ...fixture.lastMessage, status: 'failed' },
      pendingTasks: 0,
    });
    if (!result.success) throw new Error('fixture should be valid');

    expect(result.contact.attentionReasons).toEqual(['handoff_pending', 'message_failed']);
  });
});
