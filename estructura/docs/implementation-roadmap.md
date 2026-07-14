# Implementation Roadmap

## Phase 1 — Foundation

Goal: create the minimum architecture that proves the office model.

### Deliverables
- [x] folder structure
- [x] shared schemas
- [x] coordinator skeleton
- [x] 6 agent specs wired as placeholders
- [x] prompt files in repo
- [x] memory interfaces
- [x] approval interface
- [x] event logging
- [x] one end-to-end happy path test

Done — see `docs/architecture.md` > "Implementation status" for what each
piece actually does today and what's intentionally still a placeholder.

## Phase 2 — Useful workflows

Goal: make it useful for real operations.

### Deliverables
- lead qualification flow
- strategy generation flow
- proposal generation flow
- ops handoff flow
- review flow
- draft persistence
- state transitions
- retry behavior

## Phase 3 — External integration

Goal: connect to actual business systems.

### Deliverables
- CRM adapter
- email adapter
- document export
- task creation adapter
- inbound message normalization

## Phase 4 — Production hardening

### Deliverables
- role-based approvals
- analytics / traces dashboard
- dead-letter handling
- rate limits
- backoff and circuit breaker logic
- better tests
- prompt versioning metadata

## Build order

1. schemas
2. prompts
3. agent runners
4. coordinator
5. persistence
6. workflows
7. adapters
8. tests
9. polish
