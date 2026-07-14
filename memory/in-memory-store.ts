import type { ApprovalRequest, GatedAction, Stage, TraceEvent, WorkflowRun } from '../schemas';
import type { MemoryStore } from './types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/**
 * Process-local memory store (estructura/docs/implementation-roadmap.md Phase 1:
 * "memory interfaces"). Real persistence (disk/DB) is a later phase — swap the
 * implementation behind MemoryStore without touching callers.
 */
export class InMemoryMemoryStore implements MemoryStore {
  private runs = new Map<string, WorkflowRun>();

  createRun(initialStage: Stage = 'new_lead'): WorkflowRun {
    const now = Date.now();
    const run: WorkflowRun = {
      id: nextId('run'),
      stage: initialStage,
      createdAt: now,
      updatedAt: now,
      artifacts: {},
      history: [],
    };
    this.runs.set(run.id, run);
    return run;
  }

  getRun(id: string): WorkflowRun | undefined {
    return this.runs.get(id);
  }

  updateRun(id: string, patch: Partial<Pick<WorkflowRun, 'stage' | 'artifacts' | 'pendingApproval'>>): WorkflowRun {
    const run = this.mustGet(id);
    const updated: WorkflowRun = {
      ...run,
      ...patch,
      artifacts: { ...run.artifacts, ...(patch.artifacts ?? {}) },
      updatedAt: Date.now(),
    };
    this.runs.set(id, updated);
    return updated;
  }

  appendTrace(id: string, event: Omit<TraceEvent, 'id' | 'runId' | 'timestamp'>): TraceEvent {
    const run = this.mustGet(id);
    const trace: TraceEvent = { ...event, id: nextId('trace'), runId: id, timestamp: Date.now() };
    run.history.push(trace);
    run.updatedAt = Date.now();
    return trace;
  }

  requestApproval(id: string, action: GatedAction, description: string): ApprovalRequest {
    const request: ApprovalRequest = {
      id: nextId('appr'),
      runId: id,
      action,
      description,
      status: 'pending',
      requestedAt: Date.now(),
    };
    this.updateRun(id, { pendingApproval: request });
    return request;
  }

  decideApproval(id: string, approved: boolean): ApprovalRequest {
    const run = this.mustGet(id);
    if (!run.pendingApproval) throw new Error(`Run ${id} has no pending approval`);
    const decided: ApprovalRequest = {
      ...run.pendingApproval,
      status: approved ? 'approved' : 'rejected',
      decidedAt: Date.now(),
    };
    this.updateRun(id, { pendingApproval: decided });
    return decided;
  }

  listRuns(): WorkflowRun[] {
    return [...this.runs.values()];
  }

  private mustGet(id: string): WorkflowRun {
    const run = this.runs.get(id);
    if (!run) throw new Error(`Unknown workflow run: ${id}`);
    return run;
  }
}
