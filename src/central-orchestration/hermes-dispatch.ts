import { z } from 'zod';
import type { AgentId } from '../../schemas';
import type {
  OfficeConfigurationDocument,
  OfficeSpecialistAction,
  OfficeSpecialistConfiguration,
} from '../central-integrations/configuration';
import { OFFICE_SPECIALIST_ACTIONS } from '../central-integrations/configuration';
import { applyTaskCommand } from '../central-tasks';
import type { CentralTask, CentralTaskState, TaskPriority } from '../central-tasks';

export const HERMES_DISPATCH_AGENT_IDS = ['proposal', 'operations', 'content', 'review-qa'] as const;
export type HermesDispatchAgentId = (typeof HERMES_DISPATCH_AGENT_IDS)[number];

const SENSITIVE_ACTIONS = new Set<OfficeSpecialistAction>([
  'send_message',
  'update_pipeline',
  'schedule_call',
]);

const IdentifierSchema = z.string().trim().min(1).max(200);
const TextSchema = z.string().trim().min(1).max(4_000);

export const HermesSpecialistDispatchSchema = z
  .object({
    dispatchId: IdentifierSchema,
    workspaceId: IdentifierSchema,
    connectionId: IdentifierSchema,
    conversationId: IdentifierSchema,
    targetAgentId: z.enum(HERMES_DISPATCH_AGENT_IDS),
    title: z.string().trim().min(1).max(200),
    instructions: TextSchema,
    requestedActions: z.array(z.enum(OFFICE_SPECIALIST_ACTIONS)).max(20),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    contactId: IdentifierSchema.nullable().default(null),
    requiresHumanApproval: z.boolean().default(false),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type HermesSpecialistDispatch = z.infer<typeof HermesSpecialistDispatchSchema>;

export type AuthenticatedHermesBinding = {
  connectionId: string;
  workspaceId: string;
  enabled: boolean;
};

export type HermesDispatchReceipt = {
  dispatchId: string;
  workspaceId: string;
  conversationId: string;
  taskId: string;
  targetAgentId: HermesDispatchAgentId;
  status: 'accepted';
  approvalRequired: boolean;
};

export type MaterializeHermesDispatchResult =
  | {
      success: true;
      state: CentralTaskState;
      task: CentralTask;
      receipt: HermesDispatchReceipt;
      duplicate: boolean;
    }
  | {
      success: false;
      code:
        | 'invalid_dispatch'
        | 'connection_disabled'
        | 'connection_mismatch'
        | 'workspace_mismatch'
        | 'configuration_not_published'
        | 'ineligible_agent'
        | 'action_not_allowed'
        | 'task_creation_failed';
      issues?: { path: string; message: string }[];
    };

function taskIdForDispatch(dispatchId: string): string {
  return `hermes-dispatch-task:${dispatchId}`;
}

function requiresApproval(
  specialist: OfficeSpecialistConfiguration,
  dispatch: HermesSpecialistDispatch,
): boolean {
  if (dispatch.requiresHumanApproval || specialist.approvalPolicy === 'always') return true;
  return specialist.approvalPolicy === 'sensitive_only'
    && dispatch.requestedActions.some((action) => SENSITIVE_ACTIONS.has(action));
}

function specialistFor(
  configuration: OfficeConfigurationDocument,
  agentId: AgentId,
): OfficeSpecialistConfiguration | null {
  if (!HERMES_DISPATCH_AGENT_IDS.includes(agentId as HermesDispatchAgentId)) return null;
  return configuration.specialists[agentId as HermesDispatchAgentId] ?? null;
}

export function materializeHermesDispatchTask(
  taskState: CentralTaskState,
  configuration: OfficeConfigurationDocument,
  binding: AuthenticatedHermesBinding,
  input: unknown,
): MaterializeHermesDispatchResult {
  const parsed = HermesSpecialistDispatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'invalid_dispatch',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : '$',
        message: issue.message,
      })),
    };
  }
  const dispatch = parsed.data;

  if (!binding.enabled) return { success: false, code: 'connection_disabled' };
  if (binding.connectionId !== dispatch.connectionId) return { success: false, code: 'connection_mismatch' };
  if (
    dispatch.workspaceId !== binding.workspaceId
    || dispatch.workspaceId !== taskState.workspaceId
    || dispatch.workspaceId !== configuration.workspaceId
  ) {
    return { success: false, code: 'workspace_mismatch' };
  }
  if (configuration.status !== 'published') {
    return { success: false, code: 'configuration_not_published' };
  }

  const specialist = specialistFor(configuration, dispatch.targetAgentId);
  if (!specialist) return { success: false, code: 'ineligible_agent' };
  if (dispatch.requestedActions.some((action) => !specialist.allowedActions.includes(action))) {
    return { success: false, code: 'action_not_allowed' };
  }

  const approvalRequired = requiresApproval(specialist, dispatch);
  const taskId = taskIdForDispatch(dispatch.dispatchId);
  const taskResult = applyTaskCommand(taskState, {
    type: 'task.created',
    commandId: `hermes-dispatch-created:${dispatch.dispatchId}`,
    taskId,
    workspaceId: dispatch.workspaceId,
    actor: { actorId: `hermes:${binding.connectionId}`, role: 'system' },
    occurredAt: dispatch.occurredAt,
    title: dispatch.title,
    description: dispatch.instructions,
    priority: dispatch.priority as TaskPriority,
    source: 'automation',
    assignedAgentId: dispatch.targetAgentId,
    contactId: dispatch.contactId,
    requiresApproval: approvalRequired,
  });
  if (!taskResult.success) return { success: false, code: 'task_creation_failed' };

  return {
    success: true,
    state: taskResult.state,
    task: taskResult.task,
    receipt: {
      dispatchId: dispatch.dispatchId,
      workspaceId: dispatch.workspaceId,
      conversationId: dispatch.conversationId,
      taskId,
      targetAgentId: dispatch.targetAgentId,
      status: 'accepted',
      approvalRequired,
    },
    duplicate: taskResult.duplicate,
  };
}
