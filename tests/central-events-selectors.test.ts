import { describe, expect, it } from 'vitest';
import type { AgentId } from '../schemas';
import {
  createMockOfficeFeed,
  reduceOfficeActivityEvents,
  selectAgentActivityMetrics,
  selectAttentionActivities,
  selectOfficeOverview,
  selectSourceActivityMetrics,
  selectTimelineEvents,
} from '../src/central-events';

const AGENT_IDS: AgentId[] = [
  'coordinator',
  'lead-intake',
  'strategy',
  'proposal',
  'operations',
  'content',
  'review-qa',
];

describe('central event selectors', () => {
  const startAt = new Date('2026-07-14T09:00:00.000Z');
  const events = createMockOfficeFeed('workspace-1', startAt);
  const state = reduceOfficeActivityEvents(events);

  it('counts current activities once instead of counting every lifecycle transition', () => {
    const overview = selectOfficeOverview(state, AGENT_IDS, startAt.getTime() + 6_000);

    expect(events).toHaveLength(8);
    expect(overview).toEqual({
      totalTrackedActivities: 5,
      activeActivities: 2,
      workingAgents: 0,
      queuedActivities: 1,
      completedActivities: 3,
      attentionActivities: 1,
    });
  });

  it('creates a complete source summary including channels with zero activity', () => {
    const metrics = selectSourceActivityMetrics(state);

    expect(metrics).toHaveLength(4);
    expect(metrics.find((item) => item.source === 'whatsapp')).toMatchObject({
      total: 2,
      completed: 2,
    });
    expect(metrics.find((item) => item.source === 'voice')).toMatchObject({ total: 1, completed: 1 });
    expect(metrics.find((item) => item.source === 'manual')).toMatchObject({ total: 1, attention: 1 });
    expect(metrics.find((item) => item.source === 'automation')).toMatchObject({ total: 1, active: 1 });
  });

  it('returns current attention items ordered from newest to oldest', () => {
    const attention = selectAttentionActivities(state);

    expect(attention).toHaveLength(1);
    expect(attention[0]).toMatchObject({ agentId: 'review-qa', status: 'approval_required' });
  });

  it('exposes per-agent totals alongside the current snapshot', () => {
    const metrics = selectAgentActivityMetrics(state, AGENT_IDS, startAt.getTime() + 6_000);
    const qa = metrics.find((item) => item.agentId === 'review-qa');
    const operations = metrics.find((item) => item.agentId === 'operations');

    expect(qa).toMatchObject({ total: 1, active: 1, attention: 1 });
    expect(qa?.snapshot.status).toBe('approval_required');
    expect(operations).toMatchObject({ total: 0, active: 0, attention: 0 });
    expect(operations?.snapshot.status).toBe('available');
  });

  it('filters historical transitions without mutating the original timeline', () => {
    const originalIds = events.map((event) => event.id);
    const filtered = selectTimelineEvents(events, {
      sources: ['whatsapp'],
      statuses: ['working'],
      limit: 2,
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.every((event) => event.source === 'whatsapp' && event.status === 'working')).toBe(true);
    expect(events.map((event) => event.id)).toEqual(originalIds);
  });
});

