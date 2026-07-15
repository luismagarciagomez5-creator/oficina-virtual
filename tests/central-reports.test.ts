import { describe, expect, it } from 'vitest';
import { applyReportCommand, buildReportContent, createCentralReportState, requestReportExport, validateReportCommand } from '../src/central-reports';
import type { ReportActor, ReportCommand } from '../src/central-reports';
import type { WorkspaceAnalytics } from '../src/central-analytics';

const WORKSPACE_ID = 'workspace-demo';
const ACTOR: ReportActor = { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID };
const ANALYTICS: WorkspaceAnalytics = {
  workspaceId: WORKSPACE_ID, generatedAt: '2026-07-15T12:00:00.000Z',
  activity: {
    bounds: { period: '7d', startAt: 1, endAt: 2, previousStartAt: 0, previousEndAt: 1, bucketMs: 1 },
    current: { events: 8, activities: 5, completed: 3, failed: 1, blocked: 1, approvalsRequired: 1, completionRate: 60, averageCompletionMs: 1_000, bySource: { whatsapp: 2, voice: 1, manual: 1, automation: 1 } },
    previous: { events: 0, activities: 0, completed: 0, failed: 0, blocked: 0, approvalsRequired: 0, completionRate: 0, averageCompletionMs: null, bySource: { whatsapp: 0, voice: 0, manual: 0, automation: 0 } },
    changes: { activities: null, completed: null, failed: null, approvalsRequired: null },
  },
  tasks: {
    snapshot: { total: 3, pending: 1, inProgress: 0, approvalRequired: 1, blocked: 0, completed: 1, failed: 0, overdue: 0 },
    createdInPeriod: 3, completedInPeriod: 1, failedInPeriod: 0, completionRate: 100,
    averageCompletionMs: 5_000, averageApprovalWaitMs: 2_000,
    bySource: { manual: 0, whatsapp: 1, voice: 1, automation: 0, routine: 1 },
  },
  routines: { snapshot: { total: 2, active: 1, paused: 0, draft: 1, queuedRuns: 0, workingRuns: 0, completedRuns: 1, failedRuns: 0 }, runsInPeriod: 1, completedRuns: 1, failedRuns: 0, cancelledRuns: 0, successRate: 100, averageRunMs: 3_000 },
  agents: [{ agentId: 'proposal', assignedTasks: 2, openTasks: 1, completedTasks: 1, overdueTasks: 0, activeRoutines: 1 }],
};

function command(overrides: Partial<ReportCommand> = {}): ReportCommand {
  return {
    type: 'report.created', commandId: 'create-report', reportId: 'report-1', workspaceId: WORKSPACE_ID,
    actor: ACTOR, occurredAt: '2026-07-15T12:00:00.000Z', title: 'Resumen', kind: 'overview', period: '7d', agentIds: [],
    ...overrides,
  } as ReportCommand;
}

describe('central reports', () => {
  it('generates a versioned structured report from analytics', () => {
    const created = applyReportCommand(createCentralReportState(WORKSPACE_ID), command());
    if (!created.success) throw new Error(created.code);
    const started = applyReportCommand(created.state, command({ type: 'report.generation_started', commandId: 'start', expectedRevision: 1 }));
    if (!started.success) throw new Error(started.code);
    const generated = applyReportCommand(started.state, command({
      type: 'report.generated', commandId: 'finish', expectedRevision: 2,
      content: buildReportContent({ kind: 'overview', analytics: ANALYTICS }),
    }));
    expect(generated).toMatchObject({ success: true, report: { status: 'ready', revision: 3 } });
    if (generated.success) expect(generated.report.content?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'activities', value: 5 })]));
  });

  it('is idempotent and rejects stale or unauthorized mutations', () => {
    const initial = createCentralReportState(WORKSPACE_ID);
    const created = applyReportCommand(initial, command());
    if (!created.success) throw new Error(created.code);
    expect(applyReportCommand(created.state, command())).toMatchObject({ success: true, duplicate: true });
    expect(applyReportCommand(created.state, command({ type: 'report.generation_started', commandId: 'stale', expectedRevision: 9 }))).toEqual({ success: false, code: 'stale_revision' });
    expect(applyReportCommand(initial, command({ commandId: 'forbidden', actor: { actorId: 'member', role: 'workspace_member', workspaceId: WORKSPACE_ID } }))).toEqual({ success: false, code: 'unauthorized' });
  });

  it('only creates export requests for ready reports in the same workspace', () => {
    let state = createCentralReportState(WORKSPACE_ID);
    const created = applyReportCommand(state, command());
    if (!created.success) throw new Error(created.code);
    state = created.state;
    expect(requestReportExport(state, ACTOR, 'report-1', 'pdf', '2026-07-15T12:01:00.000Z', 'export-1')).toEqual({ success: false, error: 'report_not_ready' });
    const started = applyReportCommand(state, command({ type: 'report.generation_started', commandId: 'start-export', expectedRevision: 1 }));
    if (!started.success) throw new Error(started.code);
    const generated = applyReportCommand(started.state, command({ type: 'report.generated', commandId: 'finish-export', expectedRevision: 2, content: buildReportContent({ kind: 'overview', analytics: ANALYTICS }) }));
    if (!generated.success) throw new Error(generated.code);
    const exported = requestReportExport(generated.state, ACTOR, 'report-1', 'pdf', '2026-07-15T12:01:00.000Z', 'export-2');
    expect(exported).toMatchObject({
      success: true, request: { filename: 'resumen.pdf', reportRevision: 3 },
    });
    if (exported.success) {
      const retried = requestReportExport(exported.state, ACTOR, 'report-1', 'pdf', '2026-07-15T12:01:00.000Z', 'export-2');
      expect(retried.success).toBe(true);
      if (retried.success) expect(retried.state.history).toHaveLength(exported.state.history.length);
    }
    expect(requestReportExport(generated.state, { actorId: 'other', role: 'workspace_admin', workspaceId: 'workspace-other' }, 'report-1', 'csv', '2026-07-15T12:01:00.000Z', 'export-3')).toEqual({ success: false, error: 'unauthorized' });
  });

  it('validates report commands before they reach persistence', () => {
    expect(validateReportCommand(command()).success).toBe(true);
    const invalid = validateReportCommand(command({ title: '', agentIds: ['unknown'] as never }));
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['title', 'agentIds.0']));
  });
});
