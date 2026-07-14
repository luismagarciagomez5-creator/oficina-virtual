import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Agent, ChatMessage } from '../types';

type Props = {
  agent: Agent | null;
  messages: ChatMessage[];
  isTyping: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onDecideApproval: (approved: boolean) => void;
};

const STATUS_LABEL: Record<Agent['status'], string> = {
  online: 'Disponible',
  working: 'Trabajando',
  idle: 'Inactivo',
  offline: 'Desconectado',
};

export default function ChatPanel({ agent, messages, isTyping, onClose, onSend, onDecideApproval }: Props) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    setDraft('');
  }, [agent?.id]);

  const submit = () => {
    if (!agent || !draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <AnimatePresence>
      {agent && (
        <motion.aside
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-slate-950/95 border-l border-slate-800 backdrop-blur-xl z-50 flex flex-col shadow-2xl"
        >
          <div className="flex items-center gap-3 p-4 border-b border-slate-800">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold border-2 shrink-0"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${agent.color}55, #0f172acc)`,
                borderColor: agent.color,
              }}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-100 font-semibold truncate">{agent.name}</div>
              <div className="text-xs text-slate-400 truncate">
                {agent.department} · {agent.role} · {STATUS_LABEL[agent.status]}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 rounded-lg p-2 hover:bg-slate-800 transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-500 px-4 pt-3">{agent.description}</p>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-slate-500 text-center mt-10">
                Escríbele a {agent.name} para empezar la conversación.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
                {m.approvalStatus === 'pending' && (
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => onDecideApproval(true)}
                      className="text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 rounded-lg px-3 py-1 hover:bg-emerald-500/25 transition-colors"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => onDecideApproval(false)}
                      className="text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/40 rounded-lg px-3 py-1 hover:bg-rose-500/25 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
                {m.approvalStatus === 'approved' && (
                  <div className="text-[11px] text-emerald-400 mt-1">✓ Aprobado</div>
                )}
                {m.approvalStatus === 'rejected' && <div className="text-[11px] text-rose-400 mt-1">✕ Rechazado</div>}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-800 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={`Escribe a ${agent.name}...`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white rounded-xl px-4 text-sm font-medium transition-colors"
            >
              Enviar
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
