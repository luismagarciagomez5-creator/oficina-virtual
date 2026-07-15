import { describe, expect, it } from 'vitest';
import {
  createInboxProjectionFixture,
  projectInboxThread,
  selectInboxStats,
  selectInboxThread,
  selectInboxThreads,
} from '../src/central-inbox';

function createThread() {
  const result = projectInboxThread(createInboxProjectionFixture());
  if (!result.success) throw new Error('Expected fixture projection to succeed');
  return result.thread;
}

describe('central multichannel inbox', () => {
  it('merges WhatsApp messages and voice calls into one contact timeline', () => {
    const thread = createThread();

    expect(thread).toMatchObject({
      workspaceId: 'workspace-demo',
      contactId: 'contact-lucia',
      channels: ['whatsapp', 'voice'],
      unreadCount: 1,
      priority: 'high',
      responsibleAgentId: 'lead-intake',
      phoneMasked: '+34 *** *** 421',
    });
    expect(thread.timeline.map((item) => item.kind)).toEqual([
      'voice_call',
      'message',
      'message',
    ]);
    expect(thread.latestPreview).toBe(
      'Quiero automatizar WhatsApp y las llamadas de la clínica.',
    );
  });

  it('rejects rows from another workspace, contact or conversation', () => {
    const fixture = createInboxProjectionFixture();
    expect(
      projectInboxThread({
        ...fixture,
        messages: [{ ...fixture.messages[0], workspaceId: 'workspace-other' }],
      }),
    ).toEqual({ success: false, error: 'workspace_mismatch' });
    expect(
      projectInboxThread({
        ...fixture,
        voiceCalls: [{ ...fixture.voiceCalls[0], contactId: 'contact-other' }],
      }),
    ).toEqual({ success: false, error: 'contact_mismatch' });
    expect(
      projectInboxThread({
        ...fixture,
        messages: [{ ...fixture.messages[0], conversationId: 'conversation-other' }],
      }),
    ).toEqual({ success: false, error: 'conversation_mismatch' });
  });

  it('assigns urgent handoffs to the orchestrator and failed messages as urgent', () => {
    const fixture = createInboxProjectionFixture();
    const handoff = projectInboxThread({
      ...fixture,
      contact: {
        ...fixture.contact,
        whatsapp: fixture.contact.whatsapp
          ? { ...fixture.contact.whatsapp, state: 'handoff_pending' }
          : null,
      },
    });
    expect(handoff.success && handoff.thread).toMatchObject({
      status: 'handoff',
      priority: 'urgent',
      responsibleAgentId: 'coordinator',
    });

    const failed = projectInboxThread({
      ...fixture,
      messages: fixture.messages.map((message, index) =>
        index === 0 ? { ...message, status: 'failed' as const } : message,
      ),
    });
    expect(failed.success && failed.thread.priority).toBe('urgent');
  });

  it('filters, sorts and resolves threads without crossing workspaces', () => {
    const base = createThread();
    const urgent = {
      ...base,
      contactId: 'contact-urgent',
      displayName: 'Contacto prioritario',
      priority: 'urgent' as const,
      unreadCount: 0,
      latestAt: '2026-07-14T14:00:00.000Z',
    };
    const threads = [base, urgent];

    expect(selectInboxThreads(threads, { query: 'lucía' })).toEqual([base]);
    expect(selectInboxThreads(threads, { unreadOnly: true })).toEqual([base]);
    expect(selectInboxThreads(threads, { sort: 'priority' })[0].contactId).toBe('contact-urgent');
    expect(selectInboxThread(threads, 'workspace-demo', 'contact-lucia')).toEqual(base);
    expect(selectInboxThread(threads, 'workspace-other', 'contact-lucia')).toBeNull();
  });

  it('calculates inbox counters from the projected threads', () => {
    const thread = createThread();
    expect(selectInboxStats([thread])).toEqual({
      total: 1,
      open: 1,
      waiting: 0,
      handoff: 0,
      unread: 1,
      whatsapp: 1,
      voice: 1,
    });
  });

  it('deduplicates repeated provider rows and exposes no raw contact phone', () => {
    const fixture = createInboxProjectionFixture();
    const result = projectInboxThread({
      ...fixture,
      messages: [...fixture.messages, fixture.messages[0]],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.thread.timeline).toHaveLength(3);
    expect(JSON.stringify(result.thread)).not.toContain('+34600123421');
  });
});
