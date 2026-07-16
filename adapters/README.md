# Adapters

Placeholder for Phase 3 of `estructura/docs/implementation-roadmap.md`
("External integration"): CRM, email, document export, task creation,
inbound message normalization.

No real adapter is implemented yet — Phase 1 only proves the office model
(schemas, coordinator, agents, memory, approval gate, tracing). When a real
adapter is added here, follow `estructura/prompts/04-adapter-integration.md`:

## Hermes (removed from here — see `src/central-orchestrator/`)

There used to be a `hermes.ts` adapter that had the office's Coordinador POST
every message to the real Hermes agent (see `Desktop/HERMES AGENT/AGENTS.md`)
for a second opinion alongside the local stage-based routing. That direction
was wrong: **Hermes is not a tool the office's Coordinador calls** — when a
workspace runs in `hermes_telegram` mode, Hermes *is* the Orquestador, and
Telegram is only the channel the CEO uses to give Hermes executive orders. The
real flow is:

`Telegram → Hermes → Oficina Virtual → especialistas/canales → destino final`

Hermes calls *into* the office to kick off full flows across specialists and
channels — the office's Coordinador never calls out to Hermes. Results don't
have to loop back through Hermes/Telegram to be delivered: a proposal can go
through Propuestas → QA → aprobación and end up sent to the client over
WhatsApp via YCloud. Telegram only ever receives confirmations, approval
requests, or summaries when that's convenient — never the required
destination of a result.

The per-workspace choice between `openrouter` (the office runs its own
Coordinador via an LLM) and `hermes_telegram` (Hermes runs it externally) now
lives in `src/central-orchestrator/` — a pure contract with no real
endpoints, tokens, or `VITE_*` secrets wired yet. See that module and
`COORDINACION_CLAUDE_CODEX.md` for the connection roadmap (bridge, auth,
signing, idempotency, event log) before any adapter talks to a real network
endpoint again.

When a real adapter is added here, follow `estructura/prompts/04-adapter-integration.md`:

- side effects behind an interface (`interface EmailAdapter { send(...): Promise<Result> }`)
- a `dryRun` mode that logs the intended action without performing it
- every send/write action gated through `orchestrator/approval.ts`
  (`ApprovalGate` + the `GatedAction` union in `schemas/workflow.ts`)
- structured logs via the same `MemoryStore.appendTrace` used by agents
- update this README with the new adapter's contract when it lands
