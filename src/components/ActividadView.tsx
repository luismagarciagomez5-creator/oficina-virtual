import type { OfficeActivityEvent } from '../central-events/types';
import { relativeTime } from '../lib/relativeTime';
import { SOURCE_LABEL_ES, SOURCE_TW_TEXT, STATUS_LABEL_ES, STATUS_TW_BG } from '../lib/statusStyles';
import type { Agent } from '../types';

type Props = {
  events: OfficeActivityEvent[];
  agents: Agent[];
  onSelectAgent: (id: string) => void;
};

const ENTITY_LABEL_ES: Record<string, string> = {
  contact: 'Contacto',
  conversation: 'Conversación',
  voice_call: 'Llamada',
  deal: 'Oportunidad',
  project: 'Proyecto',
  task: 'Tarea',
  appointment: 'Cita',
  template: 'Plantilla',
};

export default function ActividadView({ events, agents, onSelectAgent }: Props) {
  const now = Date.now();
  const agentById = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/60 mb-1">Módulo ONYXLINK</div>
        <h2 className="text-white font-semibold">Actividad</h2>
        <p className="text-sm text-white/40 mt-0.5">
          Lo que está pasando en la oficina en tiempo real — WhatsApp, voz, automatizaciones y tareas manuales.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {events.length === 0 ? (
          <div className="text-sm text-white/30 text-center mt-12">Todavía no hay actividad registrada.</div>
        ) : (
          <ul className="space-y-1.5">
            {events.map((event) => {
              const agent = agentById.get(event.agentId);
              return (
                <li key={event.id}>
                  <button
                    onClick={() => onSelectAgent(event.agentId)}
                    className="w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.035] transition-colors"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${STATUS_TW_BG[event.status]}`} />

                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={
                        agent
                          ? { background: `${agent.color}33`, color: agent.color, border: `1px solid ${agent.color}66` }
                          : undefined
                      }
                    >
                      {(agent?.name ?? event.agentId).slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white/90 truncate">{event.title}</div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-white/40 mt-0.5">
                        <span className="text-white/60">{agent?.department ?? event.agentId}</span>
                        <span>·</span>
                        <span className={SOURCE_TW_TEXT[event.source]}>{SOURCE_LABEL_ES[event.source]}</span>
                        <span>·</span>
                        <span>{STATUS_LABEL_ES[event.status]}</span>
                        {event.entityType && (
                          <>
                            <span>·</span>
                            <span>{ENTITY_LABEL_ES[event.entityType] ?? event.entityType}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{relativeTime(event.occurredAt, now)}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
