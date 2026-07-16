import { describe, expect, it } from 'vitest';
import type { CentralTask } from '../src/central-tasks';
import {
  applySkillCommand, createCentralSkillState, createSkillFixtures, detectSkillCandidates,
  isSkillEligibleAgent, selectSkillTestRuns, selectSkillVersions, validateSkillCommand,
} from '../src/central-skills';
import type { CentralSkillState, SkillCommand } from '../src/central-skills';

const WORKSPACE_ID = 'workspace-demo';
const ADMIN = { actorId: 'admin-demo', role: 'workspace_admin' as const, workspaceId: WORKSPACE_ID };

function apply(state: CentralSkillState, command: SkillCommand) {
  const result = applySkillCommand(state, command);
  if (!result.success) throw new Error(result.code);
  return result;
}

function seeded() {
  return createSkillFixtures(WORKSPACE_ID).reduce((state, command) => apply(state, command).state, createCentralSkillState(WORKSPACE_ID));
}

function command(type: SkillCommand['type'], skillId: string, expectedRevision: number, extra: Record<string, unknown> = {}) {
  return { type, commandId: `command-${type}-${expectedRevision}`, skillId, workspaceId: WORKSPACE_ID, expectedRevision, actor: ADMIN, occurredAt: `2026-07-16T${String(10 + expectedRevision).padStart(2, '0')}:00:00.000Z`, ...extra } as SkillCommand;
}

function completedTask(id: string, title: string, assignedAgentId: CentralTask['assignedAgentId']): CentralTask {
  return {
    id, workspaceId: WORKSPACE_ID, title, description: '', priority: 'normal', status: 'completed', source: 'manual',
    assignedAgentId, contactId: null, dueAt: null, requiresApproval: false, approvalStatus: 'not_required',
    approvalReason: null, blockedReason: null, failureReason: null, revision: 2,
    createdAt: '2026-07-15T08:00:00.000Z', createdBy: 'admin-demo', updatedAt: '2026-07-15T09:00:00.000Z', completedAt: '2026-07-15T09:00:00.000Z',
  };
}

describe('central skills', () => {
  it('seeds learned and active skills with immutable versions and tests', () => {
    const state = seeded();
    expect(state.skills['skill-follow-up']).toMatchObject({ origin: 'learned', status: 'draft', ownerAgentId: 'proposal' });
    expect(state.skills['skill-quality-review']).toMatchObject({ status: 'active', approvedVersion: 1 });
    expect(selectSkillVersions(state, 'skill-quality-review').map((version) => version.version)).toEqual([1]);
    expect(selectSkillTestRuns(state, 'skill-follow-up')[0]).toMatchObject({ status: 'passed', skillVersion: 1 });
  });

  it('structurally excludes WhatsApp and Voice from eligibility', () => {
    expect(isSkillEligibleAgent('coordinator')).toBe(true);
    expect(isSkillEligibleAgent('proposal')).toBe(true);
    expect(isSkillEligibleAgent('lead-intake')).toBe(false);
    expect(isSkillEligibleAgent('strategy')).toBe(false);

    const state = seeded();
    const unsafe = command('skill.assignments_updated', 'skill-follow-up', 2, { assignedAgentIds: ['lead-intake'] }) as SkillCommand;
    expect(applySkillCommand(state, unsafe)).toEqual({ success: false, code: 'ineligible_agent' });
  });

  it('requires a passing test for the current version before admin approval', () => {
    let state = seeded();
    state = apply(state, command('skill.updated', 'skill-follow-up', 2, { patch: { description: 'Versión revisada.' } })).state;
    expect(state.skills['skill-follow-up']).toMatchObject({ status: 'draft', currentVersion: 2, approvedVersion: null });
    expect(applySkillCommand(state, command('skill.approved', 'skill-follow-up', 3))).toEqual({ success: false, code: 'test_required' });

    state = apply(state, command('skill.test_recorded', 'skill-follow-up', 3, { testRunId: 'test-v2', status: 'passed', trace: [{ stepId: 'follow-step-context', label: 'Sandbox', status: 'passed', detail: 'Sin conectores reales.' }], durationMs: 100, estimatedCostUsd: 0 })).state;
    state = apply(state, command('skill.approved', 'skill-follow-up', 4)).state;
    expect(state.skills['skill-follow-up']).toMatchObject({ status: 'approved', approvedVersion: 2 });
  });

  it('allows agents to improve and test their own draft but not approve it', () => {
    const initial = seeded();
    const agentCommand = command('skill.updated', 'skill-follow-up', 2, { patch: { name: 'Seguimiento mejorado' } });
    agentCommand.actor = { actorId: 'proposal-runtime', role: 'agent', workspaceId: WORKSPACE_ID, agentId: 'proposal' };
    const updated = apply(initial, agentCommand).state;
    const approval = command('skill.approved', 'skill-follow-up', 3);
    approval.actor = agentCommand.actor;
    expect(applySkillCommand(updated, approval)).toEqual({ success: false, code: 'unauthorized' });
  });

  it('restores an old snapshot as a new draft version without rewriting history', () => {
    let state = seeded();
    state = apply(state, command('skill.updated', 'skill-follow-up', 2, { patch: { name: 'Nombre v2' } })).state;
    state = apply(state, command('skill.version_restored', 'skill-follow-up', 3, { sourceVersion: 1 })).state;
    expect(state.skills['skill-follow-up']).toMatchObject({ name: 'Seguimiento comercial contextual', currentVersion: 3, status: 'draft' });
    expect(selectSkillVersions(state, 'skill-follow-up').map((version) => version.version)).toEqual([3, 2, 1]);
    expect(selectSkillVersions(state, 'skill-follow-up')[0].restoredFromVersion).toBe(1);
  });

  it('enforces workspace isolation, optimistic revisions and idempotency', () => {
    const state = seeded();
    expect(applySkillCommand(state, { ...command('skill.updated', 'skill-follow-up', 2, { patch: { name: 'Otro' } }), workspaceId: 'workspace-other' })).toEqual({ success: false, code: 'workspace_mismatch' });
    expect(applySkillCommand(state, command('skill.updated', 'skill-follow-up', 99, { patch: { name: 'Otro' } }))).toEqual({ success: false, code: 'stale_revision' });
    const test = command('skill.test_recorded', 'skill-follow-up', 2, { testRunId: 'test-repeat', status: 'passed', trace: [{ stepId: 'follow-step-context', label: 'A', status: 'passed', detail: '' }], durationMs: 20, estimatedCostUsd: 0 });
    const first = apply(state, test);
    const duplicate = applySkillCommand(first.state, test);
    expect(duplicate.success && duplicate.duplicate).toBe(true);
    expect(Object.keys(first.state.testRuns).filter((id) => id === 'test-repeat')).toHaveLength(1);
  });

  it('detects repeated specialist work and ignores protected seats', () => {
    const tasks = [
      completedTask('p1', 'Preparar informe semanal 1', 'proposal'),
      completedTask('p2', 'Preparar informe semanal 2', 'proposal'),
      completedTask('p3', 'Preparar informe semanal 3', 'proposal'),
      completedTask('w1', 'Responder consulta 1', 'lead-intake'),
      completedTask('w2', 'Responder consulta 2', 'lead-intake'),
      completedTask('w3', 'Responder consulta 3', 'lead-intake'),
    ];
    const candidates = detectSkillCandidates(tasks);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ ownerAgentId: 'proposal', occurrences: 3 });
    expect(candidates[0].evidenceTaskIds).toEqual(['p1', 'p2', 'p3']);
  });

  it('updates assignments without invalidating an approved published version', () => {
    const state = seeded();
    const updated = apply(state, command('skill.assignments_updated', 'skill-quality-review', 5, { assignedAgentIds: [] }));
    expect(updated.skill).toMatchObject({ status: 'active', currentVersion: 1, approvedVersion: 1, assignedAgentIds: [] });
    expect(selectSkillVersions(updated.state, 'skill-quality-review')).toHaveLength(1);
  });

  it('preserves the rich editor definition across a new version', () => {
    const state = seeded();
    const original = state.skills['skill-follow-up'].definition;
    const definition = {
      ...original,
      triggers: original.triggers.map((trigger) => ({ ...trigger, type: 'schedule' as const })),
      inputs: original.inputs.map((input, index) => ({ ...input, required: index !== 0 })),
      steps: original.steps.map((step) => ({ ...step })),
      tools: original.tools.map((tool) => ({ ...tool })),
      outputs: original.outputs.map((output) => ({ ...output })),
      approval: { policy: 'sensitive_only' as const, note: 'Aprobar únicamente acciones externas.' },
    };
    const updated = apply(state, command('skill.updated', 'skill-follow-up', 2, { patch: { definition } }));
    expect(updated.skill.definition.triggers[0].type).toBe('schedule');
    expect(updated.skill.definition.inputs[0].required).toBe(false);
    expect(updated.skill.definition.approval.policy).toBe('sensitive_only');
    expect(updated.skill.definition.steps[0].toolId).toBe('follow-tool-memory');
    expect(selectSkillVersions(updated.state, 'skill-follow-up')[0].definition).toEqual(updated.skill.definition);
  });

  it('validates untrusted commands and rejects protected agent ids', () => {
    expect(validateSkillCommand(createSkillFixtures()[0]).success).toBe(true);
    const invalid = { ...createSkillFixtures()[0], ownerAgentId: 'strategy', evidenceTaskIds: [] };
    const result = validateSkillCommand(invalid);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['ownerAgentId', 'evidenceTaskIds']));
  });
});
