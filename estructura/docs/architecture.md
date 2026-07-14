# Architecture

## Overview

The system should be designed as a **business operations agent office**.

```text
Input channels
  -> Coordinator / Router
    -> Lead Intake Agent
    -> Strategy Agent
    -> Proposal Agent
    -> Operations Agent
    -> Content Agent
    -> Review QA Agent
  -> Memory + State Store
  -> Human Approval Layer
  -> External Adapters
```

## Core components

### 1. Coordinator / Router
Responsibilities:
- receive raw work items
- classify intent
- select next agent
- stop invalid flows
- request approval when required
- keep workflow state coherent

### 2. Specialist Agents
Each specialist should accept structured input and return structured output.

### 3. Memory Store
Should track:
- lead profile
- business context
- current workflow stage
- generated deliverables
- approval state
- run history

### 4. Adapters
Examples:
- email
- CRM / Notion
- messaging
- document generation
- file storage

### 5. Audit / Trace Layer
Log:
- run id
- agent invoked
- prompt version
- input payload
- output payload
- elapsed time
- action result

## Suggested domain model

### Main entities
- Lead
- Opportunity
- Proposal
- Task
- WorkflowRun
- ApprovalRequest
- ContentAsset
- ClientRecord

## Suggested stages

- `new_lead`
- `qualified`
- `strategy_drafted`
- `proposal_ready`
- `awaiting_approval`
- `ops_ready`
- `in_execution`
- `qa_review`
- `completed`
- `blocked`

## Routing pattern

1. classify incoming request
2. attach memory context
3. choose agent
4. validate input schema
5. execute agent
6. validate output schema
7. persist outputs
8. decide next step

## v1 recommendation

Build the first version around one core flow:

`lead intake -> strategy -> proposal -> ops -> qa`

Do not overbuild before that flow works end-to-end.

## Implementation status (Phase 1 — Foundation)

Implemented at the repo root: `/schemas`, `/prompts`, `/agents`, `/memory`,
`/orchestrator`, `/adapters` (README only), `/tests`.

- Coordinator routes purely by `stage` via a lookup table
  (`agents/coordinator.ts:routeForStage`) — no intent classification yet.
- All 6 specialists are deterministic placeholders (heuristic text parsing,
  no LLM call) behind the same `AgentRunner` interface, so a real model can
  be swapped in later without touching the orchestrator.
- `MemoryStore` is in-process only (`memory/in-memory-store.ts`) — no disk/DB
  persistence yet (Phase 3/4).
- The approval gate is real: the `proposal_ready -> awaiting_approval ->
  ops_ready` transition is enforced in `orchestrator/engine.ts` (Operations
  refuses to run before a human approves).
- The 3D office (`src/three/`) is wired to this engine via
  `src/hooks/useAgentChat.ts` — one shared `WorkflowRun` per browser session,
  one despacho per `AgentId`.
- Not implemented yet: real LLM calls, external adapters (CRM/email/WhatsApp),
  persisted storage, role-based approvals, a guided multi-step UI.
