import { describe, expect, it } from 'vitest';
import {
  adaptApprovalActivity,
  adaptVoiceActivity,
  adaptWhatsAppActivity,
  adaptWorkflowActivity,
  applyOfficeActivityEvent,
  createMockOfficeFeed,
  createOfficeActivityState,
  reduceOfficeActivityEvents,
  selectAgentActivity,
  shouldAgentBeSeated,
  type OfficeActivityEvent,
} from '../src/central-events';

function event(overrides: Partial<OfficeActivityEvent> = {}): OfficeActivityEvent {
  return {
    id: 'event-1',
    activityId: 'activity-1',
    workspaceId: 'workspace-1',
    agentId: 'operations',
    status: 'working',
    source: 'whatsapp',
    title: 'Procesando una tarea',
    occurredAt: '2026-07-14T10:00:00.000Z',
    ...overrides,
  };
}

describe('central office activity state', () => {
  it('seats an agent only while the backend reports working', () => {
    const workingState = applyOfficeActivityEvent(createOfficeActivityState(), event());
    const working = selectAgentActivity(workingState, 'operations');

    expect(working.status).toBe('working');
    expect(shouldAgentBeSeated(working)).toBe(true);

    const queuedState = applyOfficeActivityEvent(
      createOfficeActivityState(),
      event({ status: 'queued' }),
    );
    expect(shouldAgentBeSeated(selectAgentActivity(queuedState, 'operations'))).toBe(false);
  });

  it('ignores duplicate deliveries and stale lifecycle events', () => {
    const completed = event({
      id: 'event-completed',
      status: 'completed',
      occurredAt: '2026-07-14T10:00:05.000Z',
      dedupeKey: 'activity-1:completed',
    });
    const staleWorking = event({
      id: 'event-stale',
      occurredAt: '2026-07-14T10:00:01.000Z',
    });

    const state = reduceOfficeActivityEvents([completed, completed, staleWorking]);

    expect(state.recentEvents).toHaveLength(1);
    expect(state.activities['activity-1']?.status).toBe('completed');
  });

  it('returns to available after the completion indicator settles', () => {
    const completedAt = Date.parse('2026-07-14T10:00:05.000Z');
    const state = applyOfficeActivityEvent(
      createOfficeActivityState(),
      event({ status: 'completed', occurredAt: new Date(completedAt).toISOString() }),
    );

    expect(selectAgentActivity(state, 'operations', completedAt + 2_000).status).toBe('completed');
    expect(selectAgentActivity(state, 'operations', completedAt + 6_000).status).toBe('available');
  });

  it('keeps an agent working when another activity has already completed', () => {
    const state = reduceOfficeActivityEvents([
      event({ id: 'event-a', activityId: 'activity-a', status: 'completed' }),
      event({
        id: 'event-b',
        activityId: 'activity-b',
        status: 'working',
        occurredAt: '2026-07-14T10:00:01.000Z',
      }),
    ]);

    const snapshot = selectAgentActivity(state, 'operations');
    expect(snapshot.status).toBe('working');
    expect(snapshot.activeCount).toBe(1);
  });

  it('provides a deterministic multichannel feed for UI development', () => {
    const feed = createMockOfficeFeed();
    const state = reduceOfficeActivityEvents(feed);

    expect(new Set(feed.map((item) => item.source))).toEqual(
      new Set(['whatsapp', 'voice', 'manual', 'automation']),
    );
    expect(selectAgentActivity(state, 'review-qa').status).toBe('approval_required');
    expect(selectAgentActivity(state, 'content').status).toBe('queued');
  });
});

describe('central event adapters', () => {
  const base = {
    workspaceId: 'workspace-1',
    occurredAt: '2026-07-14T12:00:00.000Z',
  };

  it('keeps a WhatsApp processing lifecycle on one specialist activity', () => {
    const working = adaptWhatsAppActivity({
      ...base,
      eventId: 'wa-1',
      conversationId: 'conversation-1',
      phase: 'processing',
      agentId: 'strategy',
    });
    const completed = adaptWhatsAppActivity({
      ...base,
      eventId: 'wa-2',
      conversationId: 'conversation-1',
      phase: 'responded',
      agentId: 'strategy',
    });

    expect(working.activityId).toBe(completed.activityId);
    expect(working).toMatchObject({ source: 'whatsapp', status: 'working', agentId: 'strategy' });
    expect(completed.status).toBe('completed');
  });

  it('maps voice lifecycle events to a stable call activity', () => {
    const connected = adaptVoiceActivity({
      ...base,
      eventId: 'voice-1',
      callId: 'call-1',
      phase: 'connected',
    });
    const ended = adaptVoiceActivity({
      ...base,
      eventId: 'voice-2',
      callId: 'call-1',
      phase: 'ended',
    });

    expect(connected.activityId).toBe(ended.activityId);
    expect(connected.entityType).toBe('voice_call');
    expect(connected.status).toBe('working');
    expect(ended.status).toBe('completed');
  });

  it('preserves workflow identity and maps blocked runs', () => {
    const activity = adaptWorkflowActivity({
      ...base,
      eventId: 'workflow-1',
      runId: 'run-1',
      phase: 'blocked',
      agentId: 'operations',
      entityType: 'task',
      entityId: 'task-1',
    });

    expect(activity).toMatchObject({
      runId: 'run-1',
      agentId: 'operations',
      status: 'blocked',
      entityId: 'task-1',
    });
  });

  it('routes approval requests to QA by default and closes the same activity', () => {
    const requested = adaptApprovalActivity({
      ...base,
      eventId: 'approval-1',
      approvalId: 'approval-id-1',
      phase: 'requested',
    });
    const approved = adaptApprovalActivity({
      ...base,
      eventId: 'approval-2',
      approvalId: 'approval-id-1',
      phase: 'approved',
    });

    expect(requested.activityId).toBe(approved.activityId);
    expect(requested).toMatchObject({ agentId: 'review-qa', status: 'approval_required' });
    expect(approved.status).toBe('completed');
  });
});
