import { describe, expect, it } from 'vitest';
import { createHistoricalOfficeFeed } from '../src/central-events';
import { selectWorkspaceAnalytics, selectWorkspaceAnalyticsForActor } from '../src/central-analytics';
import { applyRoutineCommand, createCentralRoutineState, createRoutineFixtures } from '../src/central-routines';
import type { CentralRoutineState, RoutineCommand } from '../src/central-routines';
import { applyTaskCommand, createCentralTaskState } from '../src/central-tasks';
import type { CentralTaskState, TaskCommand } from '../src/central-tasks';

const WORKSPACE_ID = 'workspace-demo';
const NOW = Date.parse('2026-07-17T12:00:00.000Z');
const ACTOR = { actorId: 'admin-demo', role: 'workspace_admin' as const };

function taskState(): CentralTaskState {
  let state = createCentralTaskState(WORKSPACE_ID);
  const commands: TaskCommand[] = [
    {
      type: 'task.created', commandId: 'task-a-1', taskId: 'task-a', workspaceId: WORKSPACE_ID, actor: ACTOR,
      occurredAt: '2026-07-16T08:00:00.000Z', title: 'Seguimiento', priority: 'high', source: 'whatsapp',
      assignedAgentId: 'proposal', dueAt: '2026-07-16T10:00:00.000Z', requiresApproval: true,
    },
    {
      type: 'task.started', commandId: 'task-a-2', taskId: 'task-a', workspaceId: WORKSPACE_ID, actor: ACTOR,
      occurredAt: '2026-07-16T08:01:00.000Z', expectedRevision: 1,
    },
    {
      type: 'task.approval_requested', commandId: 'task-a-3', taskId: 'task-a', workspaceId: WORKSPACE_ID,
      actor: { actorId: 'proposal-agent', role: 'agent' }, occurredAt: '2026-07-16T08:02:00.000Z',
      expectedRevision: 2, reason: 'Enviar propuesta.',
    },
    {
      type: 'task.approval_resolved', commandId: 'task-a-4', taskId: 'task-a', workspaceId: WORKSPACE_ID,
      actor: ACTOR, occurredAt: '2026-07-16T08:07:00.000Z', expectedRevision: 3, decision: 'approved',
    },
    {
      type: 'task.completed', commandId: 'task-a-5', taskId: 'task-a', workspaceId: WORKSPACE_ID,
      actor: ACTOR, occurredAt: '2026-07-16T08:10:00.000Z', expectedRevision: 4,
    },
  ];
  for (const command of commands) {
    const result = applyTaskCommand(state, command);
    if (!result.success) throw new Error(result.code);
    state = result.state;
  }
  return state;
}

function routineState(): CentralRoutineState {
  let state = createRoutineFixtures(WORKSPACE_ID).reduce((current, command) => {
    const result = applyRoutineCommand(current, command);
    if (!result.success) throw new Error(result.code);
    return result.state;
  }, createCentralRoutineState(WORKSPACE_ID));
  const commands: RoutineCommand[] = [
    {
      type: 'routine.run_queued', commandId: 'run-a-1', routineId: 'routine-daily-follow-up', runId: 'run-a',
      workspaceId: WORKSPACE_ID, expectedRevision: 2, actor: { actorId: 'scheduler', role: 'system' },
      occurredAt: '2026-07-16T07:00:00.000Z', scheduledFor: '2026-07-16T07:00:00.000Z', nextRunAt: '2026-07-17T07:00:00.000Z',
    },
    {
      type: 'routine.run_started', commandId: 'run-a-2', routineId: 'routine-daily-follow-up', runId: 'run-a',
      workspaceId: WORKSPACE_ID, expectedRunRevision: 1, actor: { actorId: 'worker', role: 'system' }, occurredAt: '2026-07-16T07:00:01.000Z',
    },
    {
      type: 'routine.run_completed', commandId: 'run-a-3', routineId: 'routine-daily-follow-up', runId: 'run-a',
      workspaceId: WORKSPACE_ID, expectedRunRevision: 2, actor: { actorId: 'worker', role: 'system' },
      occurredAt: '2026-07-16T07:00:11.000Z', taskId: 'task-a',
    },
  ];
  for (const command of commands) {
    const result = applyRoutineCommand(state, command);
    if (!result.success) throw new Error(result.code);
    state = result.state;
  }
  return state;
}

describe('workspace operational analytics', () => {
  it('combines activity, task, approval, routine and agent metrics', () => {
    const events = createHistoricalOfficeFeed(WORKSPACE_ID, new Date(NOW), 7);
    const result = selectWorkspaceAnalytics(
      { workspaceId: WORKSPACE_ID, period: '7d', now: NOW, timeZone: 'Europe/Madrid' },
      events,
      taskState(),
      routineState(),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.analytics.activity.current.activities).toBe(28);
    expect(result.analytics.tasks).toMatchObject({
      createdInPeriod: 1, completedInPeriod: 1, completionRate: 100,
      averageCompletionMs: 600_000, averageApprovalWaitMs: 300_000,
    });
    expect(result.analytics.routines).toMatchObject({ runsInPeriod: 1, completedRuns: 1, successRate: 100, averageRunMs: 10_000 });
    expect(result.analytics.agents.find((agent) => agent.agentId === 'proposal')).toMatchObject({ assignedTasks: 1, completedTasks: 1 });
  });

  it('rejects every cross-workspace source instead of silently mixing tenants', () => {
    const events = createHistoricalOfficeFeed(WORKSPACE_ID, new Date(NOW), 1);
    events[0] = { ...events[0], workspaceId: 'workspace-other' };
    expect(selectWorkspaceAnalytics(
      { workspaceId: WORKSPACE_ID, period: '24h', now: NOW }, events, taskState(), routineState(),
    )).toEqual({ success: false, error: 'workspace_mismatch' });
  });

  it('allows superadmins and same-workspace members but rejects other tenants', () => {
    const events = createHistoricalOfficeFeed(WORKSPACE_ID, new Date(NOW), 1);
    const input = { workspaceId: WORKSPACE_ID, period: '24h' as const, now: NOW };
    const sources = [events, taskState(), routineState()] as const;

    expect(selectWorkspaceAnalyticsForActor(
      { actorId: 'member-a', role: 'workspace_member', workspaceId: WORKSPACE_ID }, input, ...sources,
    ).success).toBe(true);
    expect(selectWorkspaceAnalyticsForActor(
      { actorId: 'root', role: 'super_admin', workspaceId: null }, input, ...sources,
    ).success).toBe(true);
    expect(selectWorkspaceAnalyticsForActor(
      { actorId: 'member-b', role: 'workspace_member', workspaceId: 'workspace-other' }, input, ...sources,
    )).toEqual({ success: false, error: 'unauthorized' });
  });
});
