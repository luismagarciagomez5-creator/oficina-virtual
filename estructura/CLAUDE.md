# OnyxLink Agent Office — Master Repertoire for Claude Code

You are working inside a project that must implement an **AI agent office** for business operations, inspired by a multi-department company structure.

Your job is **not** to create a single assistant. Your job is to create a system with:

1. one coordinator/orchestrator
2. multiple specialist agents
3. explicit handoffs
4. persistent operational memory
5. approval boundaries
6. observable execution traces
7. production-minded implementation choices

Read and obey all files in this repository in the following order before coding:

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/implementation-roadmap.md`
4. every file under `docs/rules/`
5. every file under `docs/agent-specs/`
6. every file under `docs/workflows/`
7. every file under `docs/templates/` when generating artifacts

## Non-negotiable design intent

This project must behave like an **AI operating office**, not like a monolithic chatbot.

### Mandatory system shape

- A **Coordinator Agent** receives work.
- The coordinator classifies intent and routes to specialist agents.
- Specialist agents produce structured outputs.
- Outputs are stored or passed forward.
- High-risk actions require approval.
- The system records what happened and why.
- The system can resume work from state.

## Required specialist agents

Minimum v1 agent set:

- Lead Intake Agent
- Strategy Agent
- Proposal Agent
- Operations Agent
- Content Agent
- Review / QA Agent

## Implementation stance

Prefer:

- clean modular code
- file-per-domain boundaries
- typed schemas for agent IO
- auditable prompts
- explicit state transitions
- deterministic handoff contracts
- retry-safe operations
- human approval gates for side effects

Avoid:

- giant prompt strings spread everywhere
- hidden state
- implicit routing logic
- agents that write directly to production systems without approval rules
- vague outputs without schemas
- “magic” orchestration impossible to debug

## What good output looks like

A production-capable foundation with:

- `/agents`
- `/orchestrator`
- `/memory`
- `/workflows`
- `/schemas`
- `/prompts`
- `/adapters`
- `/tests`
- `/docs`

## Required engineering behavior

When implementing:

1. plan first
2. create schemas before prompt wiring
3. create prompts before routing logic
4. create routing before adapters
5. create tests for critical workflows
6. document assumptions in markdown
7. prefer incremental deliverables over giant rewrites

## Required documentation behavior

Whenever you create a major component, also update:

- `docs/architecture.md` if architecture changes
- `docs/implementation-roadmap.md` if scope changes
- the relevant `docs/agent-specs/*.md` if behavior changes
- the relevant workflow file if handoffs change

## Approval policy

Require explicit approval before implementing or enabling:

- outbound email sending
- WhatsApp message sending
- CRM mutation in production
- destructive deletes
- autonomous external publishing
- billing or invoice generation

## Success condition

The project is successful only if it can support a real business workflow from:

lead intake -> qualification -> strategy -> proposal -> ops handoff -> QA

with clear state, reusable prompts, and inspectable outputs.
