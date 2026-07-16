import { useState } from 'react';
import {
  applyOrchestratorCommand,
  createCentralOrchestratorState,
  createOrchestratorFixtures,
  selectActiveOrchestratorConfig,
} from '../central-orchestrator';
import type {
  CentralOrchestratorState,
  HermesTelegramConfig,
  OpenRouterConfig,
  OrchestratorActorRole,
  OrchestratorCommand,
  OrchestratorMode,
  WorkspaceOrchestratorBinding,
} from '../central-orchestrator';

const WORKSPACE_ID = 'workspace-demo';

function applyOrKeep(state: CentralOrchestratorState, command: OrchestratorCommand): CentralOrchestratorState {
  const result = applyOrchestratorCommand(state, command);
  return result.success ? result.state : state;
}

function seedState(workspaceId: string): CentralOrchestratorState {
  return createOrchestratorFixtures(workspaceId).reduce(applyOrKeep, createCentralOrchestratorState(workspaceId));
}

export type OrchestratorFeed = {
  binding: WorkspaceOrchestratorBinding;
  activeConfig: OpenRouterConfig | HermesTelegramConfig;
  loading: boolean;
  error: string | null;
  selectMode: (mode: OrchestratorMode) => void;
  updateOpenRouterConfig: (model: string | null) => void;
  /** Only the bot identifier — the bridge endpoint is backend-provisioned, never admin-entered. */
  updateHermesBotId: (botId: string | null) => void;
};

export function useOrchestratorFeed(actorEmail: string, role: OrchestratorActorRole, workspaceId = WORKSPACE_ID): OrchestratorFeed {
  const [state, setState] = useState<CentralOrchestratorState>(() => seedState(workspaceId));
  const [error, setError] = useState<string | null>(null);
  const actor = { actorId: actorEmail, role, workspaceId };

  const dispatch = (build: (expectedRevision: number) => OrchestratorCommand) => {
    setState((previous) => {
      const result = applyOrchestratorCommand(previous, build(previous.binding.revision));
      if (!result.success) {
        setError(result.code);
        return previous;
      }
      setError(null);
      return result.state;
    });
  };

  const selectMode = (mode: OrchestratorMode) =>
    dispatch((expectedRevision) => ({
      type: 'orchestrator.mode_selected', commandId: crypto.randomUUID(), workspaceId, actor,
      occurredAt: new Date().toISOString(), expectedRevision, mode,
    }));

  const updateOpenRouterConfig = (model: string | null) =>
    dispatch((expectedRevision) => ({
      type: 'orchestrator.openrouter_config_updated', commandId: crypto.randomUUID(), workspaceId, actor,
      occurredAt: new Date().toISOString(), expectedRevision, model,
    }));

  const updateHermesBotId = (botId: string | null) =>
    dispatch((expectedRevision) => ({
      type: 'orchestrator.hermes_bot_updated', commandId: crypto.randomUUID(), workspaceId, actor,
      occurredAt: new Date().toISOString(), expectedRevision, botId,
    }));

  return {
    binding: state.binding,
    activeConfig: selectActiveOrchestratorConfig(state),
    loading: false,
    error,
    selectMode,
    updateOpenRouterConfig,
    updateHermesBotId,
  };
}
