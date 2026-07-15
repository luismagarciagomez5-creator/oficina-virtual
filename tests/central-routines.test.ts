import { describe, expect, it } from 'vitest';
import {
  applyRoutineCommand,
  createCentralRoutineState,
  createRoutineFixtures,
  selectDueRoutines,
  selectRoutineRuns,
  selectRoutineStats,
  selectRoutines,
  validateRoutineCommand,
} from '../src/central-routines';
import type { CentralRoutineState, RoutineCommand } from '../src/central-routines';

const WORKSPACE_ID = 'workspace-demo';

function apply(state: CentralRoutineState, command: RoutineCommand) {
  const result = applyRoutineCommand(state, command);
  if (!result.success) throw new Error(result.code);
  return result;
}

function seeded() {
  return createRoutineFixtures(WORKSPACE_ID).reduce((state, command) => apply(state, command).state, createCentralRoutineState(WORKSPACE_ID));
}

describe('central routines', () => {
  it('creates versioned routines and filters them by workspace metadata', () => {
    const state = seeded();
    expect(selectRoutines(state)).toHaveLength(2);
    expect(selectRoutines(state, { status: 'active' })[0]).toMatchObject({ id: 'routine-daily-follow-up', revision: 2 });
    expect(selectRoutineStats(state)).toMatchObject({ total: 2, active: 1, draft: 1 });
  });

  it('rejects cross-workspace, stale and unauthorized mutations', () => {
    const state = seeded();
    const pause: RoutineCommand = {
      type: 'routine.paused', commandId: 'pause-1', routineId: 'routine-daily-follow-up', workspaceId: 'workspace-other',
      expectedRevision: 2, actor: { actorId: 'admin', role: 'workspace_admin' }, occurredAt: '2026-07-15T09:00:00.000Z',
    };
    expect(applyRoutineCommand(state, pause)).toEqual({ success: false, code: 'workspace_mismatch' });
    expect(applyRoutineCommand(state, { ...pause, workspaceId: WORKSPACE_ID, expectedRevision: 1 })).toEqual({ success: false, code: 'stale_revision' });
    expect(applyRoutineCommand(state, { ...pause, workspaceId: WORKSPACE_ID, actor: { actorId: 'member', role: 'workspace_member' } })).toEqual({ success: false, code: 'unauthorized' });
  });

  it('tracks an idempotent scheduled run through completion', () => {
    let state = seeded();
    const queued: RoutineCommand = {
      type: 'routine.run_queued', commandId: 'run-command-1', routineId: 'routine-daily-follow-up', runId: 'run-1',
      workspaceId: WORKSPACE_ID, expectedRevision: 2, actor: { actorId: 'scheduler', role: 'system' },
      occurredAt: '2026-07-16T07:00:00.000Z', scheduledFor: '2026-07-16T07:00:00.000Z', nextRunAt: '2026-07-17T07:00:00.000Z',
    };
    const first = apply(state, queued);
    state = first.state;
    expect(applyRoutineCommand(state, queued)).toMatchObject({ success: true, duplicate: true });
    state = apply(state, {
      type: 'routine.run_started', commandId: 'run-command-2', routineId: 'routine-daily-follow-up', runId: 'run-1',
      workspaceId: WORKSPACE_ID, expectedRunRevision: 1, actor: { actorId: 'worker', role: 'system' }, occurredAt: '2026-07-16T07:00:02.000Z',
    }).state;
    state = apply(state, {
      type: 'routine.run_completed', commandId: 'run-command-3', routineId: 'routine-daily-follow-up', runId: 'run-1',
      workspaceId: WORKSPACE_ID, expectedRunRevision: 2, actor: { actorId: 'worker', role: 'system' },
      occurredAt: '2026-07-16T07:00:05.000Z', taskId: 'task-generated-1',
    }).state;
    expect(selectRoutineRuns(state, 'routine-daily-follow-up')[0]).toMatchObject({ status: 'completed', taskId: 'task-generated-1', revision: 3 });
    expect(selectRoutineStats(state).completedRuns).toBe(1);
  });

  it('selects only active routines whose externally supplied next run is due', () => {
    const state = seeded();
    expect(selectDueRoutines(state, Date.parse('2026-07-16T06:59:59.000Z'))).toEqual([]);
    expect(selectDueRoutines(state, Date.parse('2026-07-16T07:00:00.000Z')).map((routine) => routine.id)).toEqual(['routine-daily-follow-up']);
  });

  it('validates structured schedules without implementing a local scheduler', () => {
    expect(validateRoutineCommand(createRoutineFixtures()[0]).success).toBe(true);
    const invalid = validateRoutineCommand({
      ...createRoutineFixtures()[0],
      schedule: { kind: 'weekly', timezone: 'Europe/Madrid', time: '28:00', daysOfWeek: [], dayOfMonth: null, scheduledAt: null },
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['schedule.time', 'schedule.daysOfWeek']));
  });

  it('supports one-time and monthly template schedules', () => {
    const base = createRoutineFixtures()[0];
    const oneTime = validateRoutineCommand({
      ...base,
      commandId: 'create-once',
      routineId: 'routine-once',
      assignedAgentId: null,
      schedule: {
        kind: 'once', timezone: 'Europe/Madrid', time: '12:00', daysOfWeek: [], dayOfMonth: null,
        scheduledAt: '2026-07-20T10:00:00.000Z',
      },
    });
    const monthly = validateRoutineCommand({
      ...base,
      commandId: 'create-monthly',
      routineId: 'routine-monthly',
      schedule: {
        kind: 'monthly', timezone: 'Europe/Madrid', time: '09:30', daysOfWeek: [], dayOfMonth: 15, scheduledAt: null,
      },
    });
    expect(oneTime.success).toBe(true);
    expect(monthly.success).toBe(true);
  });
});
