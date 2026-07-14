import { describe, expect, it } from 'vitest';
import { InMemoryMemoryStore } from '../memory/in-memory-store';
import { OfficeEngine } from '../orchestrator/engine';
import type { LeadBrief } from '../schemas';
import type { ProposalDraft } from '../schemas';
import type { QAResult } from '../schemas';

describe('lead intake -> strategy -> proposal -> ops -> qa (happy path)', () => {
  it('drives a run through every stage in estructura/docs/architecture.md', async () => {
    const memory = new InMemoryMemoryStore();
    const engine = new OfficeEngine(memory);

    // 1. Lead Intake
    const intake = await engine.handleAgentMessage(
      'lead-intake',
      'Tengo una tienda de zapatos y no doy abasto respondiendo por whatsapp, necesito ayuda ya',
    );
    const runId = intake.runId;
    expect(intake.stage).toBe('qualified');
    const lead = intake.output as LeadBrief;
    expect(lead.niche).toBe('Tienda / e-commerce');
    expect(lead.channel).toBe('WhatsApp');
    expect(lead.urgency).toBe('high');

    // 2. Coordinator should now point at Strategy
    const routed1 = await engine.handleAgentMessage('coordinator', '', runId);
    expect(routed1.output).toMatchObject({ nextAgent: 'strategy' });

    // 3. Strategy
    const strategy = await engine.handleAgentMessage('strategy', 'recomienda algo', runId);
    expect(strategy.stage).toBe('strategy_drafted');

    // 4. Proposal
    const proposal = await engine.handleAgentMessage('proposal', 'prepara la propuesta', runId);
    expect(proposal.stage).toBe('proposal_ready');
    const proposalDraft = proposal.output as ProposalDraft;
    expect(proposalDraft.recurringMaintenancePrice).toBeGreaterThan(0);

    // 5. Review/QA validates the proposal -> should request human approval
    const qaOnProposal = await engine.handleAgentMessage('review-qa', '', runId);
    expect(qaOnProposal.stage).toBe('awaiting_approval');
    expect(qaOnProposal.approvalRequestId).toBeTruthy();
    expect((qaOnProposal.output as QAResult).pass).toBe(true);

    // Operations must refuse to run before approval (the gate).
    const blockedOps = await engine.handleAgentMessage('operations', 'empieza', runId);
    expect(blockedOps.stage).toBe('awaiting_approval');
    expect(blockedOps.output).toHaveProperty('blockedReason');

    // 6. Human approves
    const decided = await engine.decideApproval(runId, true);
    expect(decided.status).toBe('approved');

    // 7. Operations now runs
    const ops = await engine.handleAgentMessage('operations', 'empieza', runId);
    expect(ops.stage).toBe('in_execution');

    // 8. Review/QA validates the execution -> completed
    const qaOnOps = await engine.handleAgentMessage('review-qa', '', runId);
    expect(qaOnOps.stage).toBe('completed');
    expect((qaOnOps.output as QAResult).pass).toBe(true);

    // Every step left a trace.
    const run = (await memory.getRun(runId))!;
    expect(run.history.length).toBeGreaterThanOrEqual(6);
    expect(run.history.every((t) => t.result === 'ok')).toBe(true);
  });
});
