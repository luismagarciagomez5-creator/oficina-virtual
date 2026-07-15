import { useMemo, useState } from 'react';
import {
  createInboxProjectionFixture,
  projectInboxThread,
  selectInboxStats,
  selectInboxThreads,
} from '../central-inbox';
import type { InboxFilters, InboxStats, InboxThread } from '../central-inbox/types';

// Adapter hook for src/central-inbox (Codex's multichannel inbox contract —
// see COORDINACION_CLAUDE_CODEX.md). Seeds from Codex's own fixture, which
// wraps the single real Contact360 fixture plus simulated messages/calls —
// same "one real contact, no invented ones" discipline as useContact360Feed.
// The only thing owned here is `draftsByContact`: unsent draft replies typed
// in the UI. They never join `thread.timeline` and are never dispatched
// anywhere — "no enviaremos mensajes... aparecerán como... borradores".

const DEFAULT_FILTERS: InboxFilters = { sort: 'recent' };

export type InboxFeed = {
  threads: InboxThread[];
  filteredThreads: InboxThread[];
  filters: InboxFilters;
  setFilters: (patch: Partial<InboxFilters>) => void;
  resetFilters: () => void;
  stats: InboxStats;
  draftsByContact: Record<string, string[]>;
  addDraftMessage: (contactId: string, text: string) => void;
};

function seedThreads(): InboxThread[] {
  const result = projectInboxThread(createInboxProjectionFixture());
  return result.success ? [result.thread] : [];
}

export function useInboxFeed(): InboxFeed {
  const [threads] = useState<InboxThread[]>(seedThreads);
  const [filters, setFiltersState] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [draftsByContact, setDraftsByContact] = useState<Record<string, string[]>>({});

  const filteredThreads = useMemo(() => selectInboxThreads(threads, filters), [threads, filters]);
  const stats = useMemo(() => selectInboxStats(threads), [threads]);

  const setFilters = (patch: Partial<InboxFilters>) => setFiltersState((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFiltersState(DEFAULT_FILTERS);

  const addDraftMessage = (contactId: string, text: string) => {
    if (!text.trim()) return;
    setDraftsByContact((prev) => ({ ...prev, [contactId]: [...(prev[contactId] ?? []), text.trim()] }));
  };

  return { threads, filteredThreads, filters, setFilters, resetFilters, stats, draftsByContact, addDraftMessage };
}
