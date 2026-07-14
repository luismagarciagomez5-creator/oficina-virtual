import { useCallback, useState } from 'react';
import { InMemoryMemoryStore } from '../../memory/in-memory-store';
import { OfficeEngine } from '../../orchestrator/engine';
import { formatOfficeReply } from '../lib/formatOfficeReply';
import type { AgentId } from '../../schemas';
import type { Agent, ChatMessage } from '../types';

// One office = one run of the pipeline for the whole browser session (see
// estructura/docs/architecture.md WorkflowRun). Every despacho talks to the
// same engine/memory instance so a lead started at Lead Intake is still
// there when you walk over to Strategy or Proposal.
const memory = new InMemoryMemoryStore();
const engine = new OfficeEngine(memory);
let activeRunId: string | undefined;

export type PendingApproval = { agentId: AgentId; description: string };

export function useAgentChat() {
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [typingAgentId, setTypingAgentId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  const sendMessage = useCallback(async (agent: Agent, text: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() };
    setMessagesByAgent((prev) => ({ ...prev, [agent.id]: [...(prev[agent.id] ?? []), userMsg] }));
    setTypingAgentId(agent.id);

    await new Promise((r) => setTimeout(r, 350 + Math.random() * 400)); // feels like the character is "typing"

    const result = await engine.handleAgentMessage(agent.id, text, activeRunId);
    activeRunId = result.runId;

    const agentMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      text: formatOfficeReply(agent.id, result.output),
      timestamp: Date.now(),
      approvalRequestId: result.approvalRequestId,
      approvalStatus: result.approvalRequestId ? 'pending' : undefined,
    };
    setMessagesByAgent((prev) => ({ ...prev, [agent.id]: [...(prev[agent.id] ?? []), agentMsg] }));
    setTypingAgentId((current) => (current === agent.id ? null : current));
    if (result.approvalRequestId) {
      setPendingApproval({ agentId: agent.id, description: agentMsg.text });
    }
  }, []);

  const decideApproval = useCallback((agent: Agent, approved: boolean) => {
    if (!activeRunId) return;
    engine.decideApproval(activeRunId, approved);
    setPendingApproval(null);

    setMessagesByAgent((prev) => {
      const list = prev[agent.id] ?? [];
      const updated = list.map((m) =>
        m.approvalStatus === 'pending' ? { ...m, approvalStatus: approved ? ('approved' as const) : ('rejected' as const) } : m,
      );
      const decisionMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        text: approved
          ? '✅ Aprobado. El run pasa a Operaciones.'
          : '❌ Rechazado. El run queda bloqueado hasta revisión.',
        timestamp: Date.now(),
      };
      return { ...prev, [agent.id]: [...updated, decisionMsg] };
    });
  }, []);

  return { messagesByAgent, sendMessage, decideApproval, typingAgentId, pendingApproval };
}
