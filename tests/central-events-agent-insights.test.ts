import { describe, expect, it } from 'vitest';
import type { AgentId } from '../schemas';
import {
  AGENT_CAPABILITIES,
  createHistoricalOfficeFeed,
  createMockOfficeFeed,
  reduceOfficeActivityEvents,
  selectAgentLastActivity,
  selectAgentOperationalInsights,
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

describe('agent operational insights', () => {
  const startAt = new Date('2026-07-14T09:00:00.000Z');
  const currentEvents = createMockOfficeFeed('workspace-1', startAt);
  const state = reduceOfficeActivityEvents(currentEvents);
  const historicalEvents = createHistoricalOfficeFeed(
    'workspace-1',
    new Date('2026-07-15T00:00:00.000Z'),
    14,
  );
  const insights = selectAgentOperationalInsights(
    state,
    historicalEvents,
    AGENT_IDS,
    startAt.getTime() + 6_000,
  );

  it('returns exactly one insight for every office agent', () => {
    expect(insights.map((insight) => insight.agentId)).toEqual(AGENT_IDS);
    expect(insights.every((insight) => insight.capabilities.length > 0)).toBe(true);
  });

  it('derives availability from current runtime state', () => {
    expect(insights.find((insight) => insight.agentId === 'review-qa')).toMatchObject({
      availability: 'attention',
      canAcceptWork: false,
      currentSource: 'manual',
    });
    expect(insights.find((insight) => insight.agentId === 'operations')).toMatchObject({
      availability: 'available',
      canAcceptWork: true,
      currentSource: null,
    });
  });

  it('counts unique activities instead of lifecycle transitions', () => {
    const totalActivities = insights.reduce((total, insight) => total + insight.totalActivities, 0);
    expect(totalActivities).toBe(56);
    expect(insights.every((insight) => insight.averageCompletionMs === 120_000 || insight.averageCompletionMs === null)).toBe(true);
  });

  it('reports a stable primary source and bounded success rate', () => {
    for (const insight of insights) {
      expect(insight.successRate).toBeGreaterThanOrEqual(0);
      expect(insight.successRate).toBeLessThanOrEqual(100);
      expect(insight.primarySource).not.toBeNull();
    }
  });

  it('keeps capabilities explicit for future panel migration', () => {
    expect(AGENT_CAPABILITIES.operations.map((capability) => capability.id)).toEqual([
      'manage-projects',
      'schedule-actions',
      'execute-tools',
    ]);
    expect(AGENT_CAPABILITIES['review-qa'].some((capability) => capability.id === 'request-approval')).toBe(true);
  });

  it('selects the newest activity without mutating the timeline', () => {
    const originalIds = currentEvents.map((event) => event.id);
    const latest = selectAgentLastActivity(currentEvents, 'lead-intake');

    expect(latest?.status).toBe('completed');
    expect(currentEvents.map((event) => event.id)).toEqual(originalIds);
  });
});

