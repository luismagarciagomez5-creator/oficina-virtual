import type { CentralOrchestratorState, HermesTelegramConfig, OpenRouterConfig, OrchestratorAuditEntry, WorkspaceOrchestratorBinding } from './types';

export function selectOrchestratorBinding(state: CentralOrchestratorState): WorkspaceOrchestratorBinding {
  return state.binding;
}

export function selectActiveOrchestratorConfig(state: CentralOrchestratorState): OpenRouterConfig | HermesTelegramConfig {
  return state.binding.activeMode === 'openrouter' ? state.binding.openrouter : state.binding.hermesTelegram;
}

export function selectOrchestratorAudit(state: CentralOrchestratorState, limit = 50): OrchestratorAuditEntry[] {
  return [...state.audit].slice(-limit).reverse();
}
