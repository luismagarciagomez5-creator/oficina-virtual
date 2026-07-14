# Adapters

Placeholder for Phase 3 of `estructura/docs/implementation-roadmap.md`
("External integration"): CRM, email, document export, task creation,
inbound message normalization.

No real adapter is implemented yet — Phase 1 only proves the office model
(schemas, coordinator, agents, memory, approval gate, tracing). When a real
adapter is added here, follow `estructura/prompts/04-adapter-integration.md`:

- side effects behind an interface (`interface EmailAdapter { send(...): Promise<Result> }`)
- a `dryRun` mode that logs the intended action without performing it
- every send/write action gated through `orchestrator/approval.ts`
  (`ApprovalGate` + the `GatedAction` union in `schemas/workflow.ts`)
- structured logs via the same `MemoryStore.appendTrace` used by agents
- update this README with the new adapter's contract when it lands
