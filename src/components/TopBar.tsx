import { useState } from 'react';
import type { PendingApproval } from '../hooks/useAgentChat';
import { STATUS_TW_BG as STATUS_DOT } from '../lib/statusStyles';
import type { Agent } from '../types';

export type CameraMode = 'iso' | '2d';

type Props = {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  pendingApproval: PendingApproval | null;
  onNewTask: (text: string) => void;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
};

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-30" onClick={onClose} />;
}

export default function TopBar({ agents, onSelectAgent, pendingApproval, onNewTask, cameraMode, onCameraModeChange }: Props) {
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState('');

  const submitTask = () => {
    if (!taskDraft.trim()) return;
    onNewTask(taskDraft.trim());
    setTaskDraft('');
    setTaskOpen(false);
  };

  return (
    <div className="onyx-topbar flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 shrink-0 z-20">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="md:hidden flex items-center justify-center w-8 h-8 border border-violet-400/40 rounded-md bg-black/50 text-[11px] font-bold text-white">OV</div>
        <div className="onyx-segment flex items-center p-0.5 text-xs">
          {(['iso', '2d'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onCameraModeChange(mode)}
              className={`px-2 sm:px-3 py-1.5 rounded-[5px] font-medium transition-colors ${
                cameraMode === mode ? 'bg-violet-600/90 text-white shadow-[0_0_14px_rgba(124,58,237,.28)]' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {mode === 'iso' ? (
                <><span className="sm:hidden">ISO</span><span className="hidden sm:inline">Isométrica</span></>
              ) : '2D'}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setAgentsOpen((o) => !o)}
            aria-expanded={agentsOpen}
            aria-haspopup="menu"
            className="onyx-control flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white/80 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,.8)]" />
            Agentes
          </button>
          {agentsOpen && (
            <>
              <Backdrop onClose={() => setAgentsOpen(false)} />
              <div
                className="onyx-popover onyx-agent-menu absolute left-0 top-full mt-2 w-64 z-40 py-1.5"
                role="menu"
                aria-label="Seleccionar agente"
              >
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onSelectAgent(a.id);
                      setAgentsOpen(false);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-500/[0.08] text-left transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={{ background: `${a.color}33`, color: a.color, border: `1px solid ${a.color}66` }}
                    >
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white/90 truncate">{a.name}</div>
                      <div className="text-[10px] text-white/35 truncate">{a.department}</div>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[a.status]}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="onyx-icon-button relative w-8 h-8 flex items-center justify-center transition-colors"
            aria-label="Notificaciones"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/65">
              <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
            {pendingApproval && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-950" />
            )}
          </button>
          {bellOpen && (
            <>
              <Backdrop onClose={() => setBellOpen(false)} />
              <div className="onyx-popover absolute right-0 top-full mt-2 w-72 z-40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 mb-2">Notificaciones</div>
                {pendingApproval ? (
                  <button
                    onClick={() => {
                      onSelectAgent(pendingApproval.agentId);
                      setBellOpen(false);
                    }}
                    className="w-full text-left bg-rose-500/10 border border-rose-500/30 rounded-md p-2.5 hover:bg-rose-500/15 transition-colors"
                  >
                    <div className="text-[11px] font-medium text-rose-300 mb-0.5">⚠️ Aprobación pendiente</div>
                    <div className="text-[11px] text-slate-400 line-clamp-3 whitespace-pre-line">{pendingApproval.description}</div>
                  </button>
                ) : (
                  <div className="text-xs text-white/35 py-2">No hay notificaciones pendientes.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setTaskOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors shadow-[0_0_18px_rgba(124,58,237,.3)] border border-violet-400/30"
          >
            <span className="text-base leading-none">+</span>
            <span className="sm:hidden">Tarea</span>
            <span className="hidden sm:inline">Nueva tarea</span>
          </button>
          {taskOpen && (
            <>
              <Backdrop onClose={() => setTaskOpen(false)} />
              <div className="onyx-popover absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-1.5rem))] z-40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 mb-2">Describe el lead o la tarea</div>
                <textarea
                  value={taskDraft}
                  onChange={(e) => setTaskDraft(e.target.value)}
                  placeholder="Ej: tienda de zapatos que necesita atención al cliente por WhatsApp..."
                  rows={3}
                  className="onyx-input w-full rounded-md px-2.5 py-2 text-xs resize-none"
                />
                <div className="text-[10px] text-white/35 mt-1.5 mb-2">Se envía a Lead Intake y abre su despacho.</div>
                <button
                  onClick={submitTask}
                  disabled={!taskDraft.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-md py-2 text-xs font-semibold transition-colors"
                >
                  Crear tarea
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-white/45 border-l border-white/[0.08] ml-1 pl-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.7)]" />
          Oficina en línea
        </div>
      </div>
    </div>
  );
}
