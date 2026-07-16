import type { OrchestratorConnectionStatus, OrchestratorMode, OrchestratorMutationErrorCode } from '../central-orchestrator';

// Same pattern as statusStyles.ts — single source for how central-orchestrator's
// enums read across the connection-settings UI.
export const ORCHESTRATOR_MODE_LABEL_ES: Record<OrchestratorMode, string> = {
  openrouter: 'OpenRouter (chat nativo)',
  hermes_telegram: 'Hermes por Telegram',
};

export const ORCHESTRATOR_MODE_DESCRIPTION_ES: Record<OrchestratorMode, string> = {
  openrouter: 'El Coordinador de esta oficina piensa por sí mismo, con un modelo servido a través de OpenRouter.',
  hermes_telegram: 'Hermes es el Orquestador: Telegram → Hermes → Oficina Virtual → especialistas/canales → destino final.',
};

export const ORCHESTRATOR_STATUS_LABEL_ES: Record<OrchestratorConnectionStatus, string> = {
  not_configured: 'Sin configurar',
  pending: 'Configurado, sin verificar',
  connected: 'Conectado',
  error: 'Error',
};

export const ORCHESTRATOR_STATUS_TW: Record<OrchestratorConnectionStatus, string> = {
  not_configured: 'text-white/45 border-white/10 bg-white/[0.03]',
  pending: 'text-amber-300/80 border-amber-500/25 bg-amber-500/[0.06]',
  connected: 'text-emerald-300/80 border-emerald-500/25 bg-emerald-500/[0.06]',
  error: 'text-rose-300/80 border-rose-500/25 bg-rose-500/[0.06]',
};

export const ORCHESTRATOR_ERROR_LABEL_ES: Record<OrchestratorMutationErrorCode, string> = {
  workspace_mismatch: 'La solicitud no corresponde a este workspace.',
  unauthorized: 'Solo superadministración puede editar esta conexión.',
  stale_revision: 'Alguien más cambió esta configuración mientras editabas. Vuelve a intentarlo.',
  invalid_endpoint: 'El endpoint debe ser una URL https:// válida.',
};
