import { useCallback, useState } from 'react';
import {
  applyMemoryMutation,
  createCentralMemoryState,
  createMemoryFixtures,
  reduceMemoryMutations,
} from '../central-memory';
import type { CentralMemoryState, MemoryMutationEvent } from '../central-memory/types';

// Adapter hook for src/central-memory (Codex's pure model) — same pattern as
// useOfficeActivityFeed: fixtures today, real workspace events later, without
// changing what MemoriaView consumes. See COORDINACION_CLAUDE_CODEX.md.
const WORKSPACE_ID = 'workspace-demo';

export type ContactMemoryFeed = {
  state: CentralMemoryState;
  forgetItem: (contactId: string, itemId: string) => void;
};

function seedState(): CentralMemoryState {
  return reduceMemoryMutations(createMemoryFixtures(), createCentralMemoryState());
}

export function useContactMemoryFeed(): ContactMemoryFeed {
  const [state, setState] = useState<CentralMemoryState>(seedState);

  const forgetItem = useCallback((contactId: string, itemId: string) => {
    const event: MemoryMutationEvent = {
      id: `forget-${itemId}-${Date.now()}`,
      kind: 'item.forgotten',
      workspaceId: WORKSPACE_ID,
      contactId,
      source: 'manual',
      occurredAt: new Date().toISOString(),
      itemId,
    };
    setState((prev) => applyMemoryMutation(prev, event));
  }, []);

  return { state, forgetItem };
}
