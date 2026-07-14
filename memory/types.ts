import type { ApprovalRequest, GatedAction, Stage, TraceEvent, WorkflowRun } from '../schemas';

export interface MemoryStore {
  createRun(initialStage?: Stage): WorkflowRun;
  getRun(id: string): WorkflowRun | undefined;
  updateRun(id: string, patch: Partial<Pick<WorkflowRun, 'stage' | 'artifacts' | 'pendingApproval'>>): WorkflowRun;
  appendTrace(id: string, event: Omit<TraceEvent, 'id' | 'runId' | 'timestamp'>): TraceEvent;
  requestApproval(id: string, action: GatedAction, description: string): ApprovalRequest;
  decideApproval(id: string, approved: boolean): ApprovalRequest;
  listRuns(): WorkflowRun[];
}
