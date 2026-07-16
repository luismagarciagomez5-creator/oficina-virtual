import type {
  CentralOrchestratorState,
  HermesTelegramConfig,
  OpenRouterConfig,
  OrchestratorAuditAction,
  OrchestratorAuditEntry,
  OrchestratorCommand,
  OrchestratorMutationResult,
  WorkspaceOrchestratorBinding,
} from './types';

const MAX_AUDIT = 2_000;
const MAX_COMMANDS = 2_000;
const ADMIN_ROLES = new Set(['super_admin', 'workspace_admin']);

function emptyOpenRouterConfig(occurredAt: string, actorId: string): OpenRouterConfig {
  return { mode: 'openrouter', model: null, status: 'not_configured', hasApiKey: false, statusDetail: null, updatedAt: occurredAt, updatedBy: actorId };
}

function emptyHermesConfig(occurredAt: string, actorId: string): HermesTelegramConfig {
  return { mode: 'hermes_telegram', endpoint: null, connectionId: null, botId: null, status: 'not_configured', hasSecret: false, statusDetail: null, updatedAt: occurredAt, updatedBy: actorId };
}

export function createCentralOrchestratorState(workspaceId: string, seedActorId = 'system'): CentralOrchestratorState {
  const now = new Date(0).toISOString();
  return {
    workspaceId,
    binding: {
      workspaceId,
      activeMode: 'openrouter',
      openrouter: emptyOpenRouterConfig(now, seedActorId),
      hermesTelegram: emptyHermesConfig(now, seedActorId),
      revision: 1,
    },
    audit: [],
    processedCommandIds: [],
  };
}

function commandAction(command: OrchestratorCommand): OrchestratorAuditAction {
  return command.type.replace('orchestrator.', '') as OrchestratorAuditAction;
}

function append(state: CentralOrchestratorState, command: OrchestratorCommand, binding: WorkspaceOrchestratorBinding, note: string | null = null): CentralOrchestratorState {
  const entry: OrchestratorAuditEntry = {
    commandId: command.commandId,
    workspaceId: state.workspaceId,
    action: commandAction(command),
    actor: command.actor,
    occurredAt: command.occurredAt,
    revision: binding.revision,
    note,
  };
  return {
    ...state,
    binding,
    audit: [...state.audit, entry].slice(-MAX_AUDIT),
    processedCommandIds: [command.commandId, ...state.processedCommandIds].slice(0, MAX_COMMANDS),
  };
}

/** Never allows plaintext http:// — a real bridge only ever gets called over https. */
function isValidEndpoint(endpoint: string): boolean {
  return /^https:\/\/.+/.test(endpoint.trim());
}

export function applyOrchestratorCommand(state: CentralOrchestratorState, command: OrchestratorCommand): OrchestratorMutationResult {
  if (command.workspaceId !== state.workspaceId) return { success: false, code: 'workspace_mismatch' };
  if (command.actor.role !== 'super_admin' && command.actor.workspaceId !== state.workspaceId) return { success: false, code: 'unauthorized' };

  if (state.processedCommandIds.includes(command.commandId)) {
    return { success: true, state, binding: state.binding, duplicate: true };
  }

  const isAdminCommand = command.type !== 'orchestrator.backend_status_reported';
  if (isAdminCommand && !ADMIN_ROLES.has(command.actor.role)) return { success: false, code: 'unauthorized' };
  if (!isAdminCommand && command.actor.role !== 'system') return { success: false, code: 'unauthorized' };

  const current = state.binding;
  if (current.revision !== command.expectedRevision) return { success: false, code: 'stale_revision' };

  let binding: WorkspaceOrchestratorBinding;

  if (command.type === 'orchestrator.mode_selected') {
    binding = { ...current, activeMode: command.mode, revision: current.revision + 1 };
  } else if (command.type === 'orchestrator.openrouter_config_updated') {
    binding = {
      ...current,
      openrouter: {
        ...current.openrouter,
        model: command.model?.trim() || null,
        status: command.model?.trim() ? 'pending' : 'not_configured',
        statusDetail: null,
        updatedAt: command.occurredAt,
        updatedBy: command.actor.actorId,
      },
      revision: current.revision + 1,
    };
  } else if (command.type === 'orchestrator.hermes_bot_updated') {
    // Identifies which bot belongs to this workspace only — never touches
    // `endpoint`, which is exclusively backend-provisioned (see the
    // 'orchestrator.backend_status_reported' branch below).
    const botId = command.botId?.trim() || null;
    binding = {
      ...current,
      hermesTelegram: {
        ...current.hermesTelegram,
        botId,
        status: current.hermesTelegram.endpoint ? current.hermesTelegram.status : botId ? 'pending' : 'not_configured',
        statusDetail: null,
        updatedAt: command.occurredAt,
        updatedBy: command.actor.actorId,
      },
      revision: current.revision + 1,
    };
  } else {
    const endpoint = command.endpoint === undefined ? undefined : command.endpoint?.trim() || null;
    const connectionId = command.connectionId === undefined ? undefined : command.connectionId?.trim() || null;
    if (endpoint && !isValidEndpoint(endpoint)) return { success: false, code: 'invalid_endpoint' };
    const patch = { status: command.status, statusDetail: command.statusDetail, updatedAt: command.occurredAt, updatedBy: command.actor.actorId };
    binding =
      command.mode === 'openrouter'
        ? { ...current, openrouter: { ...current.openrouter, ...patch, hasApiKey: command.hasSecret }, revision: current.revision + 1 }
        : {
            ...current,
            hermesTelegram: {
              ...current.hermesTelegram,
              ...patch,
              hasSecret: command.hasSecret,
              ...(endpoint !== undefined ? { endpoint } : {}),
              ...(connectionId !== undefined ? { connectionId } : {}),
            },
            revision: current.revision + 1,
          };
  }

  return { success: true, state: append(state, command, binding), binding, duplicate: false };
}
