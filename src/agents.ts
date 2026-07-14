import { AGENT_META, AGENT_ORDER } from '../agents/registry';
import type { AgentId } from '../schemas';
import type { Agent, AgentStatus, CharacterAppearance } from './types';

/**
 * The office roster is the real 7-role agent office from `estructura/`
 * (see estructura/docs/agent-specs/*.md): name, department, role and
 * description come straight from agents/registry.ts (AGENT_META), which is
 * the same registry the backend engine (orchestrator/engine.ts) uses. Only
 * the purely visual bits — color, starting status, Minecraft appearance —
 * live here.
 */
const VISUAL: Record<AgentId, { color: string; status: AgentStatus; appearance: CharacterAppearance }> = {
  coordinator: {
    color: '#e2e8f0',
    status: 'available',
    appearance: { shirtColor: '#1e293b', pantsColor: '#0f172a', skinColor: '#f4c99b', hairColor: '#5c5c5c' },
  },
  'lead-intake': {
    color: '#38bdf8',
    status: 'available',
    appearance: { shirtColor: '#2563eb', pantsColor: '#1e293b', skinColor: '#f4c99b', hairColor: '#3b2417' },
  },
  strategy: {
    color: '#fbbf24',
    status: 'available',
    appearance: { shirtColor: '#7c3aed', pantsColor: '#111827', skinColor: '#f4c99b', hairColor: '#4a2c1a' },
  },
  proposal: {
    color: '#34d399',
    status: 'available',
    appearance: { shirtColor: '#059669', pantsColor: '#1e293b', skinColor: '#e3ab7a', hairColor: '#171310' },
  },
  operations: {
    color: '#a78bfa',
    status: 'available',
    appearance: { shirtColor: '#f97316', pantsColor: '#111827', skinColor: '#f4c99b', hairColor: '#222222' },
  },
  content: {
    color: '#f472b6',
    status: 'available',
    appearance: { shirtColor: '#db2777', pantsColor: '#1e293b', skinColor: '#e3ab7a', hairColor: '#1a1a1a' },
  },
  'review-qa': {
    color: '#2dd4bf',
    status: 'available',
    appearance: { shirtColor: '#0d9488', pantsColor: '#1e293b', skinColor: '#f4c99b', hairColor: '#5c3a21' },
  },
};

export const agents: Agent[] = AGENT_ORDER.map((id) => ({
  id,
  name: AGENT_META[id].name,
  department: AGENT_META[id].department,
  role: AGENT_META[id].role,
  description: AGENT_META[id].description,
  ...VISUAL[id],
}));
