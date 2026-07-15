import { describe, expect, it } from 'vitest';
import { materializeRoutineRunTask } from '../src/central-orchestration';
import { applyRoutineCommand, createCentralRoutineState, createRoutineFixtures } from '../src/central-routines';
import type { CentralRoutineState, RoutineCommand } from '../src/central-routines';
import { createCentralTaskState } from '../src/central-tasks';

const WORKSPACE_ID = 'workspace-demo';

function workingRunState(): CentralRoutineState {
  let state = createRoutineFixtures(WORKSPACE_ID).reduce((current, command) => {
    const result = applyRoutineCommand(current, command);
    if (!result.success) throw new Error(result.code);
    return result.state;
  }, createCentralRoutineState(WORKSPACE_ID));
  const commands: RoutineCommand[] = [
    {
      type: 'routine.run_queued', commandId: 'bridge-run-queued', routineId: 'routine-daily-follow-up', runId: 'bridge-run',
      workspaceId: WORKSPACE_ID, expectedRevision: 2, actor: { actorId: 'scheduler', role: 'system' },
      occurredAt: '2026-07-16T07:00:00.000Z', scheduledFor: '2026-07-16T07:00:00.000Z', nextRunAt: '2026-07-17T07:00:00.000Z',
    },
    {
      type: 'routine.run_started', commandId: 'bridge-run-started', routineId: 'routine-daily-follow-up', runId: 'bridge-run',
      workspaceId: WORKSPACE_ID, expectedRunRevision: 1, actor: { actorId: 'worker', role: 'system' },
      occurredAt: '2026-07-16T07:00:01.000Z',
    },
  ];
  for (const command of commands) {
    const result = applyRoutineCommand(state, command);
    if (!result.success) throw new Error(result.code);
    state = result.state;
  }
  return state;
}

describe('routine to task orchestration', () => {
  it('creates one task from the routine template and links it to the completed run', () => {
    const result = materializeRoutineRunTask(workingRunState(), createCentralTaskState(WORKSPACE_ID), {
      workspaceId: WORKSPACE_ID,
      routineId: 'routine-daily-follow-up',
      runId: 'bridge-run',
      occurredAt: '2026-07-16T07:00:02.000Z',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.task).toMatchObject({
      id: 'routine-run-task:bridge-run',
      title: 'Revisar oportunidades abiertas',
      source: 'routine',
      assignedAgentId: 'proposal',
    });
    expect(result.run).toMatchObject({ status: 'completed', taskId: result.task.id });
  });

  it('is idempotent when the same completed run is delivered again', () => {
    const first = materializeRoutineRunTask(workingRunState(), createCentralTaskState(WORKSPACE_ID), {
      workspaceId: WORKSPACE_ID, routineId: 'routine-daily-follow-up', runId: 'bridge-run',
      occurredAt: '2026-07-16T07:00:02.000Z',
    });
    if (!first.success) throw new Error(first.error);
    const retried = materializeRoutineRunTask(first.routineState, first.taskState, {
      workspaceId: WORKSPACE_ID, routineId: 'routine-daily-follow-up', runId: 'bridge-run',
      occurredAt: '2026-07-16T07:00:03.000Z',
    });
    expect(retried).toMatchObject({ success: true, duplicate: true });
    if (retried.success) expect(Object.keys(retried.taskState.tasks)).toHaveLength(1);
  });

  it('rejects mixed workspaces without changing either state', () => {
    const result = materializeRoutineRunTask(workingRunState(), createCentralTaskState('workspace-other'), {
      workspaceId: WORKSPACE_ID, routineId: 'routine-daily-follow-up', runId: 'bridge-run',
      occurredAt: '2026-07-16T07:00:02.000Z',
    });
    expect(result).toEqual({ success: false, error: 'workspace_mismatch' });
  });
});
