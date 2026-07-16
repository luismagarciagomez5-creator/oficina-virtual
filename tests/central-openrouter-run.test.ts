import { describe, expect, it } from 'vitest';
import {
  applyOrchestratorCommand,
  createCentralOrchestratorState,
  type CentralOrchestratorState,
  type OrchestratorActor,
  type OrchestratorCommand,
  type WorkspaceOrchestratorBinding,
} from '../src/central-orchestrator';
import { prepareOpenRouterAgentRun } from '../src/central-orchestration';

const WORKSPACE_ID = 'workspace-demo';
const NOW = '2026-07-16T10:00:00.000Z';
const ADMIN: OrchestratorActor = { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID };
const SYSTEM: OrchestratorActor = { actorId: 'backend', role: 'system', workspaceId: WORKSPACE_ID };

function apply(state: CentralOrchestratorState, command: OrchestratorCommand): CentralOrchestratorState {
  const result = applyOrchestratorCommand(state, command);
  if (!result.success) throw new Error(result.code);
  return result.state;
}

function connectedOpenRouterBinding(overrides: Partial<WorkspaceOrchestratorBinding> = {}): WorkspaceOrchestratorBinding {
  let state = createCentralOrchestratorState(WORKSPACE_ID);
  state = apply(state, {
    type: 'orchestrator.openrouter_model_policy_updated',
    commandId: 'policy-1',
    workspaceId: WORKSPACE_ID,
    actor: ADMIN,
    occurredAt: NOW,
    expectedRevision: 1,
    model: 'anthropic/claude-sonnet-4.5',
    fallbackModel: 'openai/gpt-4.1-mini',
    costProfile: 'balanced',
    dailyRequestLimit: 500,
    monthlyRequestLimit: 10_000,
    allowPremiumModels: false,
  });
  state = apply(state, {
    type: 'orchestrator.backend_status_reported',
    commandId: 'backend-1',
    workspaceId: WORKSPACE_ID,
    actor: SYSTEM,
    occurredAt: NOW,
    expectedRevision: 2,
    mode: 'openrouter',
    hasSecret: true,
    status: 'connected',
    statusDetail: null,
  });
  return { ...state.binding, ...overrides };
}

function runRequest(overrides: Record<string, unknown> = {}) {
  return {
    runId: 'openrouter-run-1',
    workspaceId: WORKSPACE_ID,
    agentId: 'proposal',
    input: 'Redacta una propuesta a partir del briefing aprobado.',
    context: { contactId: 'contact-42', taskId: 'task-1' },
    requestedBy: 'office-backend',
    occurredAt: NOW,
    ...overrides,
  };
}

describe('OpenRouter run preflight boundary', () => {
  it('prepares a backend-safe run using the workspace default model policy', () => {
    const result = prepareOpenRouterAgentRun(connectedOpenRouterBinding(), runRequest({ agentId: 'operations' }));
    expect(result).toMatchObject({
      status: 'prepared',
      run: {
        runId: 'openrouter-run-1',
        workspaceId: WORKSPACE_ID,
        agentId: 'operations',
        model: 'anthropic/claude-sonnet-4.5',
        fallbackModel: 'openai/gpt-4.1-mini',
        costProfile: 'balanced',
        dailyRequestLimit: 500,
        monthlyRequestLimit: 10_000,
        modelSource: 'workspace_default',
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/"apiKey"|"token"|"secret"/i);
  });

  it('prepares a run with an agent override without carrying credentials', () => {
    let state = createCentralOrchestratorState(WORKSPACE_ID);
    state = apply(state, {
      type: 'orchestrator.openrouter_model_policy_updated',
      commandId: 'policy-1',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: NOW,
      expectedRevision: 1,
      model: 'anthropic/claude-sonnet-4.5',
      fallbackModel: 'openai/gpt-4.1-mini',
      costProfile: 'balanced',
      allowPremiumModels: false,
    });
    state = apply(state, {
      type: 'orchestrator.openrouter_agent_override_updated',
      commandId: 'override-1',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: NOW,
      expectedRevision: 2,
      agentId: 'proposal',
      override: {
        model: 'anthropic/claude-opus-4.1',
        fallbackModel: 'anthropic/claude-sonnet-4.5',
        costProfile: 'premium',
        dailyRequestLimit: 50,
        monthlyRequestLimit: 1_000,
        allowPremiumModels: true,
      },
    });
    state = apply(state, {
      type: 'orchestrator.backend_status_reported',
      commandId: 'backend-1',
      workspaceId: WORKSPACE_ID,
      actor: SYSTEM,
      occurredAt: NOW,
      expectedRevision: 3,
      mode: 'openrouter',
      hasSecret: true,
      status: 'connected',
      statusDetail: null,
    });

    const result = prepareOpenRouterAgentRun(state.binding, runRequest());
    expect(result).toMatchObject({
      status: 'prepared',
      run: {
        model: 'anthropic/claude-opus-4.1',
        fallbackModel: 'anthropic/claude-sonnet-4.5',
        costProfile: 'premium',
        dailyRequestLimit: 50,
        monthlyRequestLimit: 1_000,
        modelSource: 'agent_override',
      },
    });
    expect(JSON.stringify(result)).not.toContain('hasApiKey');
  });

  it('rejects premium runs when the resolved policy does not allow premium models', () => {
    const base = connectedOpenRouterBinding();
    const binding = {
      ...base,
      openrouter: {
        ...base.openrouter,
        costProfile: 'premium' as const,
        allowPremiumModels: false,
      },
    };
    expect(prepareOpenRouterAgentRun(binding, runRequest())).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'premium_not_allowed',
      blockers: ['premium_not_allowed'],
    });
  });

  it('rejects missing model and missing API key before preparing a run', () => {
    const base = connectedOpenRouterBinding();
    const missingModel = {
      ...base,
      openrouter: {
        ...base.openrouter,
        model: null,
      },
    };
    expect(prepareOpenRouterAgentRun(missingModel, runRequest())).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'model_missing',
      blockers: ['model_missing'],
    });

    const missingApiKey = {
      ...base,
      openrouter: {
        ...base.openrouter,
        hasApiKey: false,
      },
    };
    expect(prepareOpenRouterAgentRun(missingApiKey, runRequest())).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'api_key_missing',
      blockers: ['api_key_missing'],
    });
  });

  it('allows Hermes to invoke specialists but reserves the coordinator for OpenRouter mode', () => {
    const base = connectedOpenRouterBinding();
    expect(prepareOpenRouterAgentRun(base, runRequest({ workspaceId: 'workspace-other' })))
      .toEqual({ status: 'rejected', runId: 'openrouter-run-1', code: 'workspace_mismatch' });
    const hermesBinding = { ...base, activeMode: 'hermes_telegram' as const };
    expect(prepareOpenRouterAgentRun(hermesBinding, runRequest({ agentId: 'proposal' }))).toMatchObject({ status: 'prepared' });
    expect(prepareOpenRouterAgentRun(hermesBinding, runRequest({ agentId: 'coordinator' }))).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'orchestrator_not_openrouter',
      blockers: ['orchestrator_not_openrouter'],
    });
  });

  it('rejects protected channel agents and disconnected OpenRouter status', () => {
    const base = connectedOpenRouterBinding();
    expect(prepareOpenRouterAgentRun(base, runRequest({ agentId: 'lead-intake' }))).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'agent_not_openrouter_managed',
      blockers: ['agent_not_openrouter_managed'],
    });
    expect(prepareOpenRouterAgentRun(base, runRequest({ agentId: 'strategy' }))).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'agent_not_openrouter_managed',
      blockers: ['agent_not_openrouter_managed'],
    });
    expect(prepareOpenRouterAgentRun({
      ...base,
      openrouter: { ...base.openrouter, status: 'pending' },
    }, runRequest())).toEqual({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'openrouter_not_connected',
      blockers: ['openrouter_not_connected'],
    });
  });

  it('rejects invalid requests and unknown secret fields', () => {
    expect(prepareOpenRouterAgentRun(connectedOpenRouterBinding(), runRequest({ input: '' }))).toMatchObject({
      status: 'rejected',
      runId: 'openrouter-run-1',
      code: 'invalid_run_request',
    });
    expect(prepareOpenRouterAgentRun(connectedOpenRouterBinding(), { ...runRequest(), apiKey: 'sk-should-not-pass' }))
      .toMatchObject({
        status: 'rejected',
        runId: 'openrouter-run-1',
        code: 'invalid_run_request',
      });
    expect(prepareOpenRouterAgentRun(connectedOpenRouterBinding(), runRequest({ agentId: 'unknown-agent' })))
      .toMatchObject({
        status: 'rejected',
        runId: 'openrouter-run-1',
        code: 'invalid_run_request',
      });
  });
});
