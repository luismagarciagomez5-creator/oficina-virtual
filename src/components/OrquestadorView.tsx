import { useState } from 'react';
import { Plug } from 'lucide-react';
import type { OrchestratorConnectionStatus, OrchestratorMode, OrchestratorMutationErrorCode } from '../central-orchestrator';
import type { OrchestratorFeed } from '../hooks/useOrchestratorFeed';
import {
  ORCHESTRATOR_ERROR_LABEL_ES,
  ORCHESTRATOR_MODE_DESCRIPTION_ES,
  ORCHESTRATOR_MODE_LABEL_ES,
  ORCHESTRATOR_STATUS_LABEL_ES,
  ORCHESTRATOR_STATUS_TW,
} from '../lib/orchestratorStyles';
import ViewHeader from './ui/ViewHeader';

// Presentational only, built against my own src/central-orchestrator/ +
// useOrchestratorFeed.ts (both mine — this is a brand-new area, not
// Codex's central-integrations/). See COORDINACION_CLAUDE_CODEX.md.
//
// This screen only records non-secret configuration (bot id, model name)
// and which mode is active. It has no field anywhere for a token/API
// key/secret — those stay backend-only by construction (validation.ts
// rejects them) — and no field to hand-type the Hermes bridge endpoint
// either: that address is provisioned and reported by the backend, shown
// here read-only. No real connection is attempted here yet.

type Props = { feed: OrchestratorFeed };

const MODES: OrchestratorMode[] = ['openrouter', 'hermes_telegram'];

function ModeCard({
  mode,
  active,
  status,
  onSelect,
}: {
  mode: OrchestratorMode;
  active: boolean;
  status: OrchestratorConnectionStatus;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-lg border p-4 flex-1 transition-colors ${
        active ? 'border-violet-400/40 bg-violet-500/[0.08]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-white/90 font-medium">{ORCHESTRATOR_MODE_LABEL_ES[mode]}</span>
        {active && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-violet-400/30 bg-violet-500/10 text-violet-200">
            Modo activo
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/45 mt-1.5 leading-relaxed">{ORCHESTRATOR_MODE_DESCRIPTION_ES[mode]}</p>
      <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full border ${ORCHESTRATOR_STATUS_TW[status]}`}>
        {ORCHESTRATOR_STATUS_LABEL_ES[status]}
      </span>
    </button>
  );
}

function SecretIndicator({ has, label }: { has: boolean; label: string }) {
  return (
    <div className="text-[11px] text-white/40 flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${has ? 'bg-emerald-400' : 'bg-white/20'}`} />
      {label}: {has ? 'configurada desde backend' : 'sin configurar'}
      <span className="text-white/25">— nunca se escribe desde esta pantalla.</span>
    </div>
  );
}

export default function OrquestadorView({ feed }: Props) {
  const { binding } = feed;
  const [modelDraft, setModelDraft] = useState(binding.openrouter.model ?? '');
  const [botIdDraft, setBotIdDraft] = useState(binding.hermesTelegram.botId ?? '');

  const openRouterDirty = modelDraft.trim() !== (binding.openrouter.model ?? '');
  const hermesDirty = botIdDraft.trim() !== (binding.hermesTelegram.botId ?? '');

  return (
    <div className="h-full flex flex-col">
      <ViewHeader
        icon={Plug}
        eyebrow="Oficina Virtual · Solo superadministración"
        title="Conexión del Orquestador"
        description="Elige cómo piensa el Coordinador de este workspace: con su propio modelo (OpenRouter) o delegando en Hermes por Telegram. Ningún secreto se gestiona desde aquí."
        guide={{
          title: 'Antes de activar un modo',
          items: [
            'OpenRouter: el Coordinador de la oficina responde por sí mismo con un modelo real.',
            'Hermes por Telegram: Hermes es el Orquestador — Telegram → Hermes → Oficina Virtual → especialistas/canales → destino final.',
            'Telegram es solo el canal de órdenes ejecutivas del CEO hacia Hermes (y, cuando conviene, confirmaciones/aprobaciones) — nunca el destino obligatorio de un resultado: una propuesta puede terminar enviada por WhatsApp vía YCloud sin pasar de nuevo por Hermes/Telegram.',
            'Identificador de bot y modelo no son secretos y se pueden editar aquí; el endpoint del bridge, tokens y API keys los gestiona el backend, jamás esta pantalla.',
          ],
        }}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 max-w-3xl">
        {feed.error && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-200/85">
            {ORCHESTRATOR_ERROR_LABEL_ES[feed.error as OrchestratorMutationErrorCode] ?? feed.error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {MODES.map((mode) => (
            <ModeCard
              key={mode}
              mode={mode}
              active={binding.activeMode === mode}
              status={mode === 'openrouter' ? binding.openrouter.status : binding.hermesTelegram.status}
              onSelect={() => feed.selectMode(mode)}
            />
          ))}
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">OpenRouter</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ORCHESTRATOR_STATUS_TW[binding.openrouter.status]}`}>
              {ORCHESTRATOR_STATUS_LABEL_ES[binding.openrouter.status]}
            </span>
          </div>
          <label className="text-[10px] uppercase tracking-wide text-white/30">Modelo</label>
          <input
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            placeholder="p. ej. anthropic/claude-sonnet-4.5"
            className="onyx-input w-full rounded-md px-3 py-2 text-xs mt-1"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 gap-2">
            <SecretIndicator has={binding.openrouter.hasApiKey} label="API key" />
            <button
              onClick={() => feed.updateOpenRouterConfig(modelDraft.trim() || null)}
              disabled={!openRouterDirty}
              className="shrink-0 onyx-control text-[11px] font-medium text-white/80 px-3 py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Guardar modelo
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Hermes por Telegram</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ORCHESTRATOR_STATUS_TW[binding.hermesTelegram.status]}`}>
              {ORCHESTRATOR_STATUS_LABEL_ES[binding.hermesTelegram.status]}
            </span>
          </div>
          <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
            Hoy Hermes solo existe en Telegram. El bridge (endpoint HTTP) lo aprovisiona y reporta el backend cuando exista — esta pantalla
            nunca pide pegarlo a mano, así funcione igual para tu workspace que para el de cualquier cliente futuro.
          </p>
          <label className="text-[10px] uppercase tracking-wide text-white/30">Identificador del bot</label>
          <input
            value={botIdDraft}
            onChange={(e) => setBotIdDraft(e.target.value)}
            placeholder="@tu_bot"
            className="onyx-input w-full rounded-md px-3 py-2 text-xs mt-1"
          />
          <div className="text-[11px] text-white/40 flex items-center gap-1.5 mt-3">
            <span className={`w-1.5 h-1.5 rounded-full ${binding.hermesTelegram.endpoint ? 'bg-emerald-400' : 'bg-white/20'}`} />
            Endpoint: {binding.hermesTelegram.endpoint ?? 'aún no aprovisionado'}
            <span className="text-white/25">— lo gestiona el backend, no esta pantalla.</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-2">
            <SecretIndicator has={binding.hermesTelegram.hasSecret} label="Token del bot" />
            <button
              onClick={() => feed.updateHermesBotId(botIdDraft.trim() || null)}
              disabled={!hermesDirty}
              className="shrink-0 onyx-control text-[11px] font-medium text-white/80 px-3 py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Guardar identificador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
