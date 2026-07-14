# AGENTS.md — Operating Rules for the OnyxLink Agent Office

## Core principle

This repository implements an **office of agents**, not a single agent.
Every component must reinforce separation of roles, handoff clarity, and operator control.

## The 7 governing rules

### 1. Every agent must have one job
No agent should own multiple unrelated responsibilities.

### 2. Every handoff must be structured
Agent output must be schema-driven so another agent or service can consume it.

### 3. Every state change must be explainable
If a lead changes status, proposal changes stage, or a task moves forward, the reason must be available in logs or stored state.

### 4. Side effects must be gated
High-risk actions require approval or explicit configuration.

### 5. Memory must be intentional
Store only information that matters to future work:
- client state
- active tasks
- pending approvals
- strategy decisions
- known constraints

Do not store noise.

### 6. Prompts are product assets
Prompts belong in versioned files, not buried in code.

### 7. Observability is mandatory
Every workflow should leave traces sufficient to answer:
- what happened?
- which agent acted?
- what input did it see?
- what output did it produce?
- why did the workflow stop or continue?

## Recommended implementation layers

### Layer 1 — schemas
Typed IO contracts.

### Layer 2 — prompts
Prompt assets per agent.

### Layer 3 — agent runners
Wrappers that call models with schemas + prompts.

### Layer 4 — orchestrator
Intent routing, sequencing, retry, approval gating.

### Layer 5 — adapters
CRM, email, Notion, messaging, internal APIs.

### Layer 6 — storage
Operational memory and run history.

## Required technical improvements over a naive implementation

- explicit retry rules
- confidence fields where useful
- fallback paths when routing is uncertain
- human override support
- resumable workflows
- test fixtures for common business cases
- dry-run mode for actions with side effects

## Minimal production safeguards

- idempotency key support where possible
- max-steps guardrails
- timeout handling
- structured errors
- dead-letter or failed-run capture
- environment-based feature flags

## Recommended deliverable shape

Implement the office as a reusable platform, not a one-off demo.

Good: reusable agents, adapters, schemas, state machine.
Bad: one route with one huge prompt.
