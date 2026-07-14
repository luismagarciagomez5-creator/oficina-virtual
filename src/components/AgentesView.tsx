import { AGENT_ORDER } from '../../agents/registry';
import type { AgentId } from '../../schemas';
import type { AgentActivitySnapshot } from '../central-events/types';
import { relativeTime } from '../lib/relativeTime';
import { SOURCE_LABEL_ES, SOURCE_TW_TEXT, STATUS_LABEL_ES, STATUS_TW_BG } from '../lib/statusStyles';
import type { Agent } from '../types';

type Props = {
  agents: Agent[];
  snapshots: Record<AgentId, AgentActivitySnapshot>;
  onOpenOffice: (id: string) => void;
  onOpenChat: (id: string) => void;
};

export default function AgentesView({ agents, snapshots, onOpenOffice, onOpenChat }: Props) {
  const now = Date.now();
  const ordered = AGENT_ORDER.map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => Boolean(a));

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/60 mb-1">Módulo ONYXLINK</div>
        <h2 className="text-white font-semibold">Agentes</h2>
        <p className="text-sm text-white/40 mt-0.5">El equipo completo — quién está haciendo qué, ahora mismo.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordered.map((agent) => {
            const snapshot = snapshots[agent.id];
            const event = snapshot?.event ?? null;
            const channelIsLive = snapshot ? snapshot.status !== 'available' && snapshot.status !== 'completed' : false;

            return (
              <div
                key={agent.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold border shrink-0"
                    style={{ background: `linear-gradient(145deg, ${agent.color}3d, #0b0910 70%)`, borderColor: agent.color }}
                  >
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white truncate">{agent.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_TW_BG[agent.status]}`} />
                    </div>
                    <div className="text-[11px] text-white/45 truncate">{agent.role}</div>
                    <div className="text-[10px] text-white/30 truncate">{agent.department}</div>
                  </div>
                </div>

                <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{agent.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md bg-white/[0.03] px-2.5 py-2">
                    <div className="text-white/30 text-[10px] uppercase tracking-wide mb-0.5">Estado</div>
                    <div className="text-white/85 font-medium truncate">{STATUS_LABEL_ES[agent.status]}</div>
                  </div>
                  <div className="rounded-md bg-white/[0.03] px-2.5 py-2">
                    <div className="text-white/30 text-[10px] uppercase tracking-wide mb-0.5">Carga actual</div>
                    <div className="text-white/85 font-medium">{snapshot?.activeCount ?? 0}</div>
                  </div>
                </div>

                <div className="rounded-md bg-white/[0.03] px-2.5 py-2 text-[11px] min-h-[52px]">
                  <div className="text-white/30 text-[10px] uppercase tracking-wide mb-0.5">Última actividad</div>
                  {event ? (
                    <>
                      <div className="text-white/80 truncate">{event.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-white/40">
                        <span className={channelIsLive ? SOURCE_TW_TEXT[event.source] : ''}>
                          {SOURCE_LABEL_ES[event.source]}
                        </span>
                        <span>·</span>
                        <span>{relativeTime(event.occurredAt, now)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-white/30">Sin actividad reciente</div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => onOpenOffice(agent.id)}
                    className="onyx-control flex-1 text-xs font-medium text-white/80 px-3 py-2 transition-colors"
                  >
                    Abrir despacho
                  </button>
                  <button
                    onClick={() => onOpenChat(agent.id)}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-md px-3 py-2 text-xs font-semibold transition-colors border border-violet-400/25"
                  >
                    Conversación
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
