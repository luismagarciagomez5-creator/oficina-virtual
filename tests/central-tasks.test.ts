import { describe, expect, it } from 'vitest';
import {
  applyTaskCommand,
  createCentralTaskState,
  createTaskFixtures,
  selectTaskBoard,
  selectTaskHistory,
  selectTaskStats,
  selectTasks,
  validateTaskCommand,
} from '../src/central-tasks';
import type { CentralTaskState, TaskCommand } from '../src/central-tasks';

const WORKSPACE_ID = 'workspace-demo';

function apply(state: CentralTaskState, command: TaskCommand) {
  const result = applyTaskCommand(state, command);
  if (!result.success) throw new Error(result.code);
  return result;
}

function seeded() {
  return createTaskFixtures(WORKSPACE_ID).reduce((state, command) => apply(state, command).state, createCentralTaskState(WORKSPACE_ID));
}

function command(type: TaskCommand['type'], taskId: string, expectedRevision: number, extra: Record<string, unknown> = {}): TaskCommand {
  return {
    type,
    commandId: `command-${type}-${expectedRevision}`,
    taskId,
    workspaceId: WORKSPACE_ID,
    expectedRevision,
    actor: { actorId: 'admin-demo', role: 'workspace_admin' },
    occurredAt: `2026-07-15T0${expectedRevision + 8}:00:00.000Z`,
    ...extra,
  } as TaskCommand;
}

describe('central tasks', () => {
  it('creates workspace-scoped tasks and keeps an immutable history', () => {
    const state = seeded();
    expect(Object.values(state.tasks)).toHaveLength(2);
    expect(selectTaskHistory(state, 'task-follow-up').map((entry) => entry.action)).toEqual(['created']);
    expect(state.tasks['task-follow-up']).toMatchObject({ priority: 'high', assignedAgentId: 'proposal', revision: 1 });
  });

  it('rejects cross-workspace and stale commands', () => {
    const state = seeded();
    expect(applyTaskCommand(state, { ...command('task.started', 'task-follow-up', 1), workspaceId: 'workspace-other' })).toEqual({ success: false, code: 'workspace_mismatch' });
    expect(applyTaskCommand(state, command('task.started', 'task-follow-up', 9))).toEqual({ success: false, code: 'stale_revision' });
  });

  it('requires human approval before completing a sensitive task', () => {
    let state = seeded();
    state = apply(state, command('task.started', 'task-follow-up', 1)).state;
    expect(applyTaskCommand(state, command('task.completed', 'task-follow-up', 2))).toEqual({ success: false, code: 'approval_required' });
    state = apply(state, command('task.approval_requested', 'task-follow-up', 2, { reason: 'Enviar propuesta al contacto.' })).state;

    const agentDecision = command('task.approval_resolved', 'task-follow-up', 3, { decision: 'approved' });
    agentDecision.actor = { actorId: 'proposal-agent', role: 'agent' };
    expect(applyTaskCommand(state, agentDecision)).toEqual({ success: false, code: 'unauthorized' });

    state = apply(state, command('task.approval_resolved', 'task-follow-up', 3, { decision: 'approved' })).state;
    state = apply(state, command('task.completed', 'task-follow-up', 4)).state;
    expect(state.tasks['task-follow-up']).toMatchObject({ status: 'completed', approvalStatus: 'approved', revision: 5 });
  });

  it('enforces lifecycle transitions and supports explicit recovery', () => {
    let state = seeded();
    expect(applyTaskCommand(state, command('task.completed', 'task-call-summary', 1))).toEqual({ success: false, code: 'invalid_transition' });
    state = apply(state, command('task.started', 'task-call-summary', 1)).state;
    state = apply(state, command('task.failed', 'task-call-summary', 2, { reason: 'Proveedor no disponible.' })).state;
    state = apply(state, command('task.reopened', 'task-call-summary', 3)).state;
    expect(state.tasks['task-call-summary']).toMatchObject({ status: 'pending', failureReason: null, revision: 4 });
  });

  it('updates editable fields through a versioned command', () => {
    const state = seeded();
    const updated = apply(state, command('task.updated', 'task-call-summary', 1, {
      patch: { title: 'Resumen revisado', priority: 'urgent', assignedAgentId: 'review-qa' },
    }));
    expect(updated.task).toMatchObject({
      title: 'Resumen revisado',
      priority: 'urgent',
      assignedAgentId: 'review-qa',
      contactId: 'contact-mario',
      revision: 2,
    });
    expect(selectTaskHistory(updated.state, 'task-call-summary')[0].action).toBe('updated');
  });

  it('deduplicates repeated commands without duplicating history', () => {
    const initial = seeded();
    const started = command('task.started', 'task-call-summary', 1);
    const first = apply(initial, started);
    const duplicate = applyTaskCommand(first.state, started);
    expect(duplicate.success && duplicate.duplicate).toBe(true);
    expect(selectTaskHistory(first.state, 'task-call-summary')).toHaveLength(2);
  });

  it('filters tasks and calculates board counters and overdue work', () => {
    const state = seeded();
    expect(selectTasks(state, { assignedAgentId: 'proposal' }).map((task) => task.id)).toEqual(['task-follow-up']);
    expect(selectTasks(state, { query: 'llamada' }).map((task) => task.id)).toEqual(['task-call-summary']);
    expect(selectTaskBoard(state).pending).toHaveLength(2);
    expect(selectTaskStats(state, Date.parse('2026-07-17T00:00:00.000Z'))).toMatchObject({ total: 2, pending: 2, overdue: 1 });
  });

  it('validates untrusted command payloads', () => {
    expect(validateTaskCommand(createTaskFixtures()[0]).success).toBe(true);
    const invalid = validateTaskCommand({ ...createTaskFixtures()[0], title: '', occurredAt: 'today' });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['title', 'occurredAt']));
  });
});
