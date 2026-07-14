import { describe, expect, it } from 'vitest';
import {
  applyMemoryMutation,
  createCentralMemoryState,
  createMemoryFixtures,
  reduceMemoryMutations,
  searchContactMemories,
  selectContactMemory,
  selectMemoryOverview,
  selectMemorySources,
  validateMemoryMutationEvent,
  type MemoryMutationEvent,
} from '../src/central-memory';

describe('central multichannel memory', () => {
  it('builds contact profiles from WhatsApp, voice and manual evidence', () => {
    const state = reduceMemoryMutations(createMemoryFixtures());
    const lucia = selectContactMemory(state, 'contact-lucia');
    const overview = selectMemoryOverview(state);

    expect(lucia?.items).toHaveLength(2);
    expect(lucia && selectMemorySources(lucia)).toEqual(['whatsapp', 'voice']);
    expect(overview).toMatchObject({ contacts: 2, items: 3, sensitiveItems: 1, crossChannelContacts: 1 });
  });

  it('forgets content and prevents an older delivery from restoring it', () => {
    const fixtures = createMemoryFixtures();
    const initial = reduceMemoryMutations(fixtures);
    const originalUpsert = fixtures.find(
      (event): event is Extract<MemoryMutationEvent, { kind: 'item.upserted' }> =>
        event.kind === 'item.upserted' && event.item.id === 'memory-lucia-preference',
    );
    expect(originalUpsert).toBeDefined();

    const forgotten = applyMemoryMutation(initial, {
      id: 'forget-event',
      kind: 'item.forgotten',
      workspaceId: 'workspace-demo',
      contactId: 'contact-lucia',
      source: 'manual',
      occurredAt: '2026-07-14T11:00:00.000Z',
      itemId: 'memory-lucia-preference',
    });
    const replayed = originalUpsert ? applyMemoryMutation(forgotten, { ...originalUpsert, id: 'replayed-old-event' }) : forgotten;

    expect(selectContactMemory(replayed, 'contact-lucia')?.items.map((item) => item.id)).not.toContain(
      'memory-lucia-preference',
    );
    expect(replayed.forgottenItemIds).toContain('memory-lucia-preference');
  });

  it('ignores duplicate events and cross-workspace collisions', () => {
    const event = createMemoryFixtures()[0];
    const once = applyMemoryMutation(createCentralMemoryState(), event);
    const duplicate = applyMemoryMutation(once, event);
    const collision = applyMemoryMutation(duplicate, { ...event, id: 'collision', workspaceId: 'other-workspace' });

    expect(duplicate).toBe(once);
    expect(collision).toBe(duplicate);
  });

  it('searches normal memories while hiding sensitive content by default', () => {
    const state = reduceMemoryMutations(createMemoryFixtures());

    expect(searchContactMemories(state, 'WhatsApp')).toHaveLength(1);
    expect(searchContactMemories(state, 'restaurante')).toHaveLength(0);
    expect(searchContactMemories(state, 'restaurante', { includeSensitive: true })).toHaveLength(1);
  });

  it('rejects malformed confidence and unknown structural fields', () => {
    const itemEvent = createMemoryFixtures().find((event) => event.kind === 'item.upserted');
    expect(itemEvent).toBeDefined();
    if (!itemEvent || itemEvent.kind !== 'item.upserted') return;

    expect(validateMemoryMutationEvent(itemEvent).success).toBe(true);
    expect(
      validateMemoryMutationEvent({ ...itemEvent, item: { ...itemEvent.item, confidence: 1.4 } }).success,
    ).toBe(false);
    expect(validateMemoryMutationEvent({ ...itemEvent, unexpected: true }).success).toBe(false);
  });
});

