import { describe, expect, it } from 'vitest';
import {
  createHistoricalOfficeFeed,
  resolveAnalyticsPeriod,
  selectPeriodAnalytics,
  selectTrendBuckets,
  type OfficeActivityEvent,
} from '../src/central-events';

describe('central event period analytics', () => {
  it('resolves today using the workspace timezone', () => {
    const now = Date.parse('2026-07-14T10:00:00.000Z');
    const bounds = resolveAnalyticsPeriod('today', now, 'Europe/Madrid');

    expect(new Date(bounds.startAt).toISOString()).toBe('2026-07-13T22:00:00.000Z');
    expect(bounds.endAt).toBe(now);
    expect(bounds.bucketMs).toBe(3_600_000);
  });

  it('calculates current and previous windows without mixing their events', () => {
    const now = Date.parse('2026-07-15T00:00:00.000Z');
    const feed = createHistoricalOfficeFeed('workspace-1', new Date(now), 14);
    const analytics = selectPeriodAnalytics(feed, '7d', now);

    expect(analytics.current.activities).toBe(28);
    expect(analytics.previous.activities).toBe(28);
    expect(analytics.current.events).toBe(56);
    expect(analytics.current.averageCompletionMs).toBe(120_000);
    expect(analytics.changes.activities).toBe(0);
  });

  it('returns null change when the previous period is zero and current has activity', () => {
    const now = Date.parse('2026-07-15T00:00:00.000Z');
    const feed = createHistoricalOfficeFeed('workspace-1', new Date(now), 1);
    const analytics = selectPeriodAnalytics(feed, '24h', now);

    expect(analytics.current.activities).toBe(4);
    expect(analytics.previous.activities).toBe(0);
    expect(analytics.changes.activities).toBeNull();
  });

  it('produces one daily bucket per day for the seven-day view', () => {
    const now = Date.parse('2026-07-15T00:00:00.000Z');
    const feed = createHistoricalOfficeFeed('workspace-1', new Date(now), 7);
    const bounds = resolveAnalyticsPeriod('7d', now);
    const buckets = selectTrendBuckets(feed, bounds);

    expect(buckets).toHaveLength(7);
    expect(buckets.every((bucket) => bucket.activities === 4)).toBe(true);
    expect(buckets.reduce((total, bucket) => total + bucket.events, 0)).toBe(56);
  });

  it('measures lifecycle duration even when an activity starts before the window', () => {
    const now = Date.parse('2026-07-15T00:00:00.000Z');
    const events: OfficeActivityEvent[] = [
      {
        id: 'started',
        activityId: 'cross-boundary',
        workspaceId: 'workspace-1',
        agentId: 'operations',
        status: 'working',
        source: 'automation',
        title: 'Started',
        occurredAt: new Date(now - 24 * 3_600_000 - 60_000).toISOString(),
      },
      {
        id: 'completed',
        activityId: 'cross-boundary',
        workspaceId: 'workspace-1',
        agentId: 'operations',
        status: 'completed',
        source: 'automation',
        title: 'Completed',
        occurredAt: new Date(now - 24 * 3_600_000 + 60_000).toISOString(),
      },
    ];

    expect(selectPeriodAnalytics(events, '24h', now).current.averageCompletionMs).toBe(120_000);
  });
});

