import type { AgentId } from '../schemas';

/**
 * Bridge to Hermes — the real OnyxLink agent (see Desktop/HERMES AGENT/AGENTS.md)
 * that runs the actual business pipeline (captación → presupuesto → seguimiento
 * → onboarding → informe mensual) with real Notion/CRM writes.
 *
 * Hermes currently only listens on Telegram — there is no HTTP endpoint yet.
 * Codex is wiring up the real bridge on its side. Until `VITE_HERMES_ENDPOINT`
 * is set, every call here returns a clearly-labeled "not connected" result
 * instead of pretending to talk to Hermes — this is the dry-run path required
 * by docs/rules/implementation-rules.md ("dry-run path for risky adapters").
 *
 * Once the bridge exists, point VITE_HERMES_ENDPOINT at it — this file is the
 * only thing that needs to change (POST { text, agentId, runId }, expect
 * { reply: string } back).
 */

export type HermesTaskInput = {
  text: string;
  agentId: AgentId;
  runId: string;
};

export type HermesTaskResult = {
  connected: boolean;
  reply: string;
};

const HERMES_ENDPOINT = import.meta.env.VITE_HERMES_ENDPOINT as string | undefined;

export async function sendTaskToHermes(input: HermesTaskInput): Promise<HermesTaskResult> {
  if (!HERMES_ENDPOINT) {
    return {
      connected: false,
      reply: 'Hermes todavía no está conectado aquí (hoy solo responde por Telegram). En cuanto Codex exponga el puente, se conecta configurando VITE_HERMES_ENDPOINT.',
    };
  }

  try {
    const res = await fetch(HERMES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    return { connected: true, reply: data.reply ?? JSON.stringify(data) };
  } catch (err) {
    return {
      connected: false,
      reply: `No se pudo contactar a Hermes en ${HERMES_ENDPOINT} (${(err as Error).message}).`,
    };
  }
}
