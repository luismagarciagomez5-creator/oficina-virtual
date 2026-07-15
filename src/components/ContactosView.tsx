import { useMemo, useState } from 'react';
import { selectContact360List } from '../central-contacts';
import type { Contact360 } from '../central-contacts/types';
import { LEAD_STATUS_LABEL_ES, LEAD_STATUS_TW } from '../lib/leadStatusStyles';
import { relativeTime } from '../lib/relativeTime';

type Props = {
  contacts: Contact360[];
  onOpenContact: (contactId: string) => void;
};

export default function ContactosView({ contacts, onOpenContact }: Props) {
  const now = Date.now();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => selectContact360List(contacts, { query }), [contacts, query]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/60 mb-1">Oficina Virtual</div>
        <h2 className="text-white font-semibold">Contactos</h2>
        <p className="text-sm text-white/40 mt-0.5">
          Cada lead visto desde WhatsApp, voz, memoria y pipeline — una sola persona, un solo perfil.
        </p>
      </div>

      <div className="px-6 pt-4 pb-2 shrink-0 max-w-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="onyx-input w-full rounded-md px-3 py-2 text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-sm text-white/30 text-center mt-12">Sin contactos que coincidan.</div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((contact) => (
              <li key={contact.contactId}>
                <button
                  onClick={() => onOpenContact(contact.contactId)}
                  className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.035] border border-white/[0.06] bg-white/[0.02] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 bg-white/[0.05] text-white/70 border border-white/[0.08]">
                    {contact.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/90 truncate">{contact.displayName}</div>
                    <div className="text-[11px] text-white/40 truncate">{contact.phoneMasked}</div>
                  </div>
                  {contact.attentionReasons.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Requiere atención" />
                  )}
                  <span className="text-[10px] text-white/50 shrink-0 hidden sm:inline">
                    {relativeTime(contact.latestActivityAt, now)}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${LEAD_STATUS_TW[contact.stage]}`}
                  >
                    {LEAD_STATUS_LABEL_ES[contact.stage]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
