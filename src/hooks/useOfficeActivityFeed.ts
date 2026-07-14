import { useEffect, useRef, useState } from 'react';
import { AGENT_ORDER } from '../../agents/registry';
import type { AgentId } from '../../schemas';
import {
  applyOfficeActivityEvent,
  createMockOfficeFeed,
  createOfficeActivityState,
  selectAgentActivity,
} from '../central-events';
import type { AgentActivitySnapshot, OfficeActivityEvent, OfficeActivityState } from '../central-events/types';

// See COORDINACION_CLAUDE_CODEX.md > "Punto de integración acordado": this is
// the adapter hook — mock source today, Supabase Realtime later. It never
// touches the central-events contract, only consumes it.

const SNAPSHOT_TICK_MS = 1000;
const LOOP_GAP_MS = 4000;

function emptySnapshots(): Record<AgentId, AgentActivitySnapshot> {
  const now = Date.now();
  const state = createOfficeActivityState();
  const snapshots = {} as Record<AgentId, AgentActivitySnapshot>;
  for (const id of AGENT_ORDER) snapshots[id] = selectAgentActivity(state, id, now);
  return snapshots;
}

/**
 * Drives the office's visual status from the shared OfficeActivityEvent
 * contract instead of chat "typing" state. Today it replays the deterministic
 * mock feed on a loop (so the office always has something happening); once a
 * real workspace exists this becomes a Supabase Realtime subscription without
 * any change to the components consuming `snapshots`.
 */
export function useOfficeActivityFeed(): Record<AgentId, AgentActivitySnapshot> {
  const [snapshots, setSnapshots] = useState<Record<AgentId, AgentActivitySnapshot>>(emptySnapshots);
  const stateRef = useRef<OfficeActivityState>(createOfficeActivityState());

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const recompute = () => {
      const next = {} as Record<AgentId, AgentActivitySnapshot>;
      const now = Date.now();
      for (const id of AGENT_ORDER) next[id] = selectAgentActivity(stateRef.current, id, now);
      setSnapshots(next);
    };

    const ingest = (event: OfficeActivityEvent) => {
      stateRef.current = applyOfficeActivityEvent(stateRef.current, event);
      recompute();
    };

    const scheduleLoop = (loopIndex: number) => {
      const template = createMockOfficeFeed();
      const baseTime = template.length ? Date.parse(template[0].occurredAt) : Date.now();

      let maxOffset = 0;
      for (const item of template) {
        const offset = Math.max(0, Date.parse(item.occurredAt) - baseTime);
        maxOffset = Math.max(maxOffset, offset);
        timeouts.push(
          setTimeout(() => {
            ingest({
              ...item,
              id: `${item.id}-loop${loopIndex}`,
              dedupeKey: item.dedupeKey ? `${item.dedupeKey}:loop${loopIndex}` : undefined,
              occurredAt: new Date().toISOString(),
            });
          }, offset),
        );
      }

      timeouts.push(setTimeout(() => scheduleLoop(loopIndex + 1), maxOffset + LOOP_GAP_MS));
    };

    scheduleLoop(0);
    const tickId = setInterval(recompute, SNAPSHOT_TICK_MS);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(tickId);
    };
  }, []);

  return snapshots;
}
