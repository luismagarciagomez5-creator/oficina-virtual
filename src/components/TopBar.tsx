import { useState } from 'react';
import type { PendingApproval } from '../hooks/useAgentChat';
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

const STATUS_DOT: Record<Agent['status'], string> = {
  online: 'bg-emerald-400',
  working: 'bg-amber-400',
  idle: 'bg-slate-400',
  offline: 'bg-rose-500',
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
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950 shrink-0 z-20">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          {(['iso', '2d'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onCameraModeChange(mode)}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                cameraMode === mode ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'iso' ? 'Isométrica' : '2D'}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setAgentsOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Agentes
          </button>
          {agentsOpen && (
            <>
              <Backdrop onClose={() => setAgentsOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 py-1.5 max-h-80 overflow-y-auto">
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onSelectAgent(a.id);
                      setAgentsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={{ background: `${a.color}33`, color: a.color, border: `1px solid ${a.color}66` }}
                    >
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-100 truncate">{a.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{a.department}</div>
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
            className="relative w-8 h-8 flex items-center justify-center bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
            aria-label="Notificaciones"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300">
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2">Notificaciones</div>
                {pendingApproval ? (
                  <button
                    onClick={() => {
                      onSelectAgent(pendingApproval.agentId);
                      setBellOpen(false);
                    }}
                    className="w-full text-left bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 hover:bg-rose-500/15 transition-colors"
                  >
                    <div className="text-[11px] font-medium text-rose-300 mb-0.5">⚠️ Aprobación pendiente</div>
                    <div className="text-[11px] text-slate-400 line-clamp-3 whitespace-pre-line">{pendingApproval.description}</div>
                  </button>
                ) : (
                  <div className="text-xs text-slate-500">No hay notificaciones pendientes.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setTaskOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <span className="text-base leading-none">+</span> Nueva tarea
          </button>
          {taskOpen && (
            <>
              <Backdrop onClose={() => setTaskOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2">Describe el lead o la tarea</div>
                <textarea
                  value={taskDraft}
                  onChange={(e) => setTaskDraft(e.target.value)}
                  placeholder="Ej: tienda de zapatos que necesita atención al cliente por WhatsApp..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 resize-none"
                />
                <div className="text-[10px] text-slate-500 mt-1.5 mb-2">Se envía a Lead Intake y abre su despacho.</div>
                <button
                  onClick={submitTask}
                  disabled={!taskDraft.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                >
                  Crear tarea
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 pl-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          En línea
        </div>
      </div>
    </div>
  );
}
