import { describe, expect, it } from 'vitest';
import {
  applyOrchestratorCommand,
  createCentralOrchestratorState,
  createOrchestratorFixtures,
  selectOpenRouterModelForAgent,
  selectActiveOrchestratorConfig,
  selectOrchestratorAudit,
  validateOrchestratorCommand,
} from '../src/central-orchestrator';
import type { CentralOrchestratorState, OrchestratorActor, OrchestratorCommand } from '../src/central-orchestrator';

const WORKSPACE_ID = 'workspace-demo';
const ADMIN: OrchestratorActor = { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID };
const MEMBER: OrchestratorActor = { actorId: 'member', role: 'workspace_member', workspaceId: WORKSPACE_ID };
const SYSTEM: OrchestratorActor = { actorId: 'backend', role: 'system', workspaceId: WORKSPACE_ID };

function apply(state: CentralOrchestratorState, command: OrchestratorCommand): CentralOrchestratorState {
  const result = applyOrchestratorCommand(state, command);
  if (!result.success) throw new Error(result.code);
  return result.state;
}

describe('central orchestrator', () => {
  it('starts in openrouter mode with nothing configured and no secrets', () => {
    const state = createCentralOrchestratorState(WORKSPACE_ID);
    expect(state.binding.activeMode).toBe('openrouter');
    expect(state.binding.openrouter).toMatchObject({ status: 'not_configured', hasApiKey: false, model: null });
    expect(state.binding.hermesTelegram).toMatchObject({ status: 'not_configured', hasSecret: false, endpoint: null, connectionId: null, botId: null });
  });

  it('switches the active mode and records an audit entry', () => {
    const state = apply(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.mode_selected', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'hermes_telegram',
    });
    expect(state.binding.activeMode).toBe('hermes_telegram');
    expect(selectOrchestratorAudit(state)).toMatchObject([{ action: 'mode_selected' }]);
  });

  it('admins can only identify the bot, never the endpoint — status goes to pending once a bot id is set', () => {
    const state = apply(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.hermes_bot_updated', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, botId: '@onyxlink_bot',
    });
    expect(state.binding.hermesTelegram).toMatchObject({ endpoint: null, connectionId: null, botId: '@onyxlink_bot', status: 'pending', hasSecret: false });
  });

  it('rejects a plaintext http:// endpoint when the backend reports one', () => {
    const result = applyOrchestratorCommand(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.backend_status_reported', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: SYSTEM,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'hermes_telegram', status: 'connected', statusDetail: null,
      hasSecret: true, endpoint: 'http://not-secure.example',
    });
    expect(result).toMatchObject({ success: false, code: 'invalid_endpoint' });
  });

  it('only the backend can report the provisioned Hermes endpoint and connection id, never an admin', () => {
    const adminAttempt = applyOrchestratorCommand(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.backend_status_reported', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'hermes_telegram', status: 'connected', statusDetail: null,
      hasSecret: true, endpoint: 'https://bridge.onyxlink.example/hermes', connectionId: 'hermes-onyxlink',
    });
    expect(adminAttempt).toMatchObject({ success: false, code: 'unauthorized' });

    const state = apply(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.backend_status_reported', commandId: 'cmd-2', workspaceId: WORKSPACE_ID, actor: SYSTEM,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'hermes_telegram', status: 'connected', statusDetail: null,
      hasSecret: true, endpoint: 'https://bridge.onyxlink.example/hermes', connectionId: 'hermes-onyxlink',
    });
    expect(state.binding.hermesTelegram).toMatchObject({
      endpoint: 'https://bridge.onyxlink.example/hermes',
      connectionId: 'hermes-onyxlink',
      hasSecret: true,
      status: 'connected',
    });
  });

  it('rejects config changes from a non-admin actor', () => {
    const result = applyOrchestratorCommand(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.openrouter_config_updated', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: MEMBER,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, model: 'anthropic/claude-sonnet-4.5',
    });
    expect(result).toMatchObject({ success: false, code: 'unauthorized' });
  });

  it('only lets a system actor report openrouter secret status, never an admin', () => {
    const adminAttempt = applyOrchestratorCommand(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.backend_status_reported', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'openrouter', hasSecret: true, status: 'connected', statusDetail: null,
    });
    expect(adminAttempt).toMatchObject({ success: false, code: 'unauthorized' });

    const state = apply(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.backend_status_reported', commandId: 'cmd-2', workspaceId: WORKSPACE_ID, actor: SYSTEM,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'openrouter', hasSecret: true, status: 'connected', statusDetail: null,
    });
    expect(state.binding.openrouter).toMatchObject({ hasApiKey: true, status: 'connected' });
  });

  it('stores workspace OpenRouter model policy without carrying secrets', () => {
    const state = apply(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.openrouter_model_policy_updated',
      commandId: 'cmd-1',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z',
      expectedRevision: 1,
      model: 'anthropic/claude-sonnet-4.5',
      fallbackModel: 'openai/gpt-4.1-mini',
      costProfile: 'balanced',
      dailyRequestLimit: 500,
      monthlyRequestLimit: 10_000,
      allowPremiumModels: false,
    });
    expect(state.binding.openrouter).toMatchObject({
      model: 'anthropic/claude-sonnet-4.5',
      fallbackModel: 'openai/gpt-4.1-mini',
      costProfile: 'balanced',
      dailyRequestLimit: 500,
      monthlyRequestLimit: 10_000,
      allowPremiumModels: false,
      hasApiKey: false,
    });
  });

  it('resolves OpenRouter defaults and agent overrides without inventing an API key', () => {
    let state = createCentralOrchestratorState(WORKSPACE_ID);
    state = apply(state, {
      type: 'orchestrator.openrouter_model_policy_updated',
      commandId: 'cmd-1',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z',
      expectedRevision: 1,
      model: 'anthropic/claude-sonnet-4.5',
      fallbackModel: 'openai/gpt-4.1-mini',
      costProfile: 'balanced',
      dailyRequestLimit: 500,
      monthlyRequestLimit: 10_000,
      allowPremiumModels: false,
    });
    state = apply(state, {
      type: 'orchestrator.openrouter_agent_override_updated',
      commandId: 'cmd-2',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:05:00.000Z',
      expectedRevision: 2,
      agentId: 'proposal',
      override: {
        model: 'anthropic/claude-opus-4.1',
        fallbackModel: 'anthropic/claude-sonnet-4.5',
        costProfile: 'premium',
        dailyRequestLimit: 50,
        allowPremiumModels: true,
      },
    });

    expect(selectOpenRouterModelForAgent(state.binding, 'operations')).toMatchObject({
      source: 'workspace_default',
      model: 'anthropic/claude-sonnet-4.5',
      fallbackModel: 'openai/gpt-4.1-mini',
      ready: false,
      blockers: ['api_key_missing'],
    });
    expect(selectOpenRouterModelForAgent(state.binding, 'proposal')).toMatchObject({
      source: 'agent_override',
      model: 'anthropic/claude-opus-4.1',
      fallbackModel: 'anthropic/claude-sonnet-4.5',
      costProfile: 'premium',
      dailyRequestLimit: 50,
      monthlyRequestLimit: 10_000,
      allowPremiumModels: true,
      ready: false,
      blockers: ['api_key_missing'],
    });
  });

  it('marks missing models and premium profiles without permission as not ready', () => {
    let state = createCentralOrchestratorState(WORKSPACE_ID);
    state = apply(state, {
      type: 'orchestrator.openrouter_model_policy_updated',
      commandId: 'cmd-1',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z',
      expectedRevision: 1,
      model: '   ',
      costProfile: 'premium',
      allowPremiumModels: false,
    });
    state = apply(state, {
      type: 'orchestrator.backend_status_reported',
      commandId: 'cmd-2',
      workspaceId: WORKSPACE_ID,
      actor: SYSTEM,
      occurredAt: '2026-07-16T09:01:00.000Z',
      expectedRevision: 2,
      mode: 'openrouter',
      hasSecret: true,
      status: 'connected',
      statusDetail: null,
    });
    expect(selectOpenRouterModelForAgent(state.binding, 'coordinator')).toMatchObject({
      model: null,
      ready: false,
      blockers: ['model_missing', 'premium_not_allowed'],
    });
  });

  it('rejects invalid OpenRouter model limits and can clear an agent override', () => {
    const invalid = applyOrchestratorCommand(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.openrouter_model_policy_updated',
      commandId: 'cmd-1',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z',
      expectedRevision: 1,
      dailyRequestLimit: 0,
    });
    expect(invalid).toEqual({ success: false, code: 'invalid_model_policy' });

    let state = apply(createCentralOrchestratorState(WORKSPACE_ID), {
      type: 'orchestrator.openrouter_agent_override_updated',
      commandId: 'cmd-2',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z',
      expectedRevision: 1,
      agentId: 'content',
      override: { model: 'openai/gpt-4.1-mini' },
    });
    expect(state.binding.openrouter.agentOverrides.content?.model).toBe('openai/gpt-4.1-mini');
    state = apply(state, {
      type: 'orchestrator.openrouter_agent_override_updated',
      commandId: 'cmd-3',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:05:00.000Z',
      expectedRevision: 2,
      agentId: 'content',
      override: null,
    });
    expect(state.binding.openrouter.agentOverrides.content).toBeUndefined();
  });

  it('rejects a stale revision and a workspace mismatch', () => {
    const state = createCentralOrchestratorState(WORKSPACE_ID);
    const stale = applyOrchestratorCommand(state, {
      type: 'orchestrator.mode_selected', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 99, mode: 'hermes_telegram',
    });
    expect(stale).toMatchObject({ success: false, code: 'stale_revision' });

    const mismatch = applyOrchestratorCommand(state, {
      type: 'orchestrator.mode_selected', commandId: 'cmd-2', workspaceId: 'other-workspace', actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'hermes_telegram',
    });
    expect(mismatch).toMatchObject({ success: false, code: 'workspace_mismatch' });
  });

  it('is idempotent for a repeated commandId', () => {
    let state = createCentralOrchestratorState(WORKSPACE_ID);
    const command: OrchestratorCommand = {
      type: 'orchestrator.mode_selected', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, mode: 'hermes_telegram',
    };
    state = apply(state, command);
    const replay = applyOrchestratorCommand(state, command);
    expect(replay).toMatchObject({ success: true, duplicate: true });
    expect(state.binding.revision).toBe(2);
  });

  it('the fixtures reflect reality: Hermes selected but not configured, nothing invented', () => {
    let state = createCentralOrchestratorState(WORKSPACE_ID);
    for (const command of createOrchestratorFixtures(WORKSPACE_ID)) state = apply(state, command);
    expect(selectActiveOrchestratorConfig(state)).toMatchObject({ mode: 'hermes_telegram', status: 'not_configured', hasSecret: false, endpoint: null, connectionId: null, botId: null });
  });

  it('validation rejects a payload smuggling a secret/token/apiKey field', () => {
    const attempt = validateOrchestratorCommand({
      type: 'orchestrator.openrouter_config_updated', commandId: 'cmd-1', workspaceId: WORKSPACE_ID, actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z', expectedRevision: 1, model: 'anthropic/claude-sonnet-4.5', apiKey: 'sk-should-be-rejected',
    });
    expect(attempt.success).toBe(false);

    const overrideAttempt = validateOrchestratorCommand({
      type: 'orchestrator.openrouter_agent_override_updated',
      commandId: 'cmd-2',
      workspaceId: WORKSPACE_ID,
      actor: ADMIN,
      occurredAt: '2026-07-16T09:00:00.000Z',
      expectedRevision: 1,
      agentId: 'proposal',
      override: { model: 'anthropic/claude-sonnet-4.5', apiKey: 'sk-should-also-be-rejected' },
    });
    expect(overrideAttempt.success).toBe(false);
  });
});
