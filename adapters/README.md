# Adapters

Placeholder for Phase 3 of `estructura/docs/implementation-roadmap.md`
("External integration"): CRM, email, document export, task creation,
inbound message normalization.

No real adapter is implemented yet — Phase 1 only proves the office model
(schemas, coordinator, agents, memory, approval gate, tracing). When a real
adapter is added here, follow `estructura/prompts/04-adapter-integration.md`:

## `hermes.ts` (real, but not yet connected)

Bridge to **Hermes**, the real OnyxLink production agent (see
`Desktop/HERMES AGENT/AGENTS.md`) — it runs the actual business pipeline
(captación → presupuesto → seguimiento → onboarding → informe mensual) with
real Notion writes. Hermes today only listens on Telegram; Codex is building
the real bridge on its side. Until then, `sendTaskToHermes` returns a
`{ connected: false, reply: "..." }` dry-run result instead of pretending to
reach it — the Coordinador despacho already calls this on every message and
shows whichever result comes back.

**To connect it for real:** set `VITE_HERMES_ENDPOINT` (a `.env` file at the
repo root, or your shell env) to whatever URL Codex exposes. Expected
contract: `POST { text, agentId, runId }` → `{ reply: string }`. No other
code needs to change — `adapters/hermes.ts` is the only file that talks to
the network.

When a real adapter is added here, follow `estructura/prompts/04-adapter-integration.md`:

- side effects behind an interface (`interface EmailAdapter { send(...): Promise<Result> }`)
- a `dryRun` mode that logs the intended action without performing it
- every send/write action gated through `orchestrator/approval.ts`
  (`ApprovalGate` + the `GatedAction` union in `schemas/workflow.ts`)
- structured logs via the same `MemoryStore.appendTrace` used by agents
- update this README with the new adapter's contract when it lands
