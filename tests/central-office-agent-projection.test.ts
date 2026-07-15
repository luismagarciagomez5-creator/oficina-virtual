import { describe, expect, it } from 'vitest';
import { agents } from '../src/agents';
import {
  applyOfficeConfigurationCommand,
  createOfficeConfigurationState,
  previewOfficeAgents,
  projectPublishedOfficeAgents,
  provisionWorkspaceOffice,
} from '../src/central-integrations';

const WORKSPACE_ID = 'workspace-a';
const ACTOR = {
  actorId: 'super-admin',
  role: 'onyxlink_super_admin' as const,
  workspaceId: WORKSPACE_ID,
};

function configuredState() {
  const occurredAt = '2026-07-15T10:00:00.000Z';
  const provisioned = provisionWorkspaceOffice(WORKSPACE_ID, occurredAt);
  const initial = createOfficeConfigurationState(provisioned, ACTOR.actorId, occurredAt);
  const updated = applyOfficeConfigurationCommand(initial, {
    type: 'update_specialist',
    workspaceId: WORKSPACE_ID,
    expectedRevision: initial.current.revision,
    actor: ACTOR,
    occurredAt: '2026-07-15T10:01:00.000Z',
    agentId: 'proposal',
    patch: {
      name: 'Especialista Comercial',
      function: 'Cualificación de oportunidades',
      objective: 'Priorizar oportunidades listas para una propuesta.',
    },
  });
  if (!updated.success) throw new Error(updated.code);
  return updated.state;
}

describe('workspace office agent projection', () => {
  it('previews specialist identity without changing protected seats or base agents', () => {
    const state = configuredState();
    const original = structuredClone(agents);
    const result = previewOfficeAgents(agents, state.current, WORKSPACE_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.projection.agents.find((agent) => agent.id === 'proposal')).toMatchObject({
      name: 'Especialista Comercial',
      role: 'Cualificación de oportunidades',
      description: 'Priorizar oportunidades listas para una propuesta.',
    });
    expect(result.projection.agents.find((agent) => agent.id === 'coordinator')).toEqual(
      agents.find((agent) => agent.id === 'coordinator'),
    );
    expect(agents).toEqual(original);
  });

  it('allows only a published document into the runtime office', () => {
    const state = configuredState();
    expect(projectPublishedOfficeAgents(agents, state.current, WORKSPACE_ID)).toEqual({
      success: false,
      code: 'configuration_not_published',
    });

    const published = applyOfficeConfigurationCommand(state, {
      type: 'publish',
      workspaceId: WORKSPACE_ID,
      expectedRevision: state.current.revision,
      actor: ACTOR,
      occurredAt: '2026-07-15T10:02:00.000Z',
    });
    if (!published.success) throw new Error(published.code);

    const result = projectPublishedOfficeAgents(agents, published.state.current, WORKSPACE_ID);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.projection.revision).toBe(published.state.current.revision);
    expect(result.projection.agents.find((agent) => agent.id === 'proposal')?.name).toBe(
      'Especialista Comercial',
    );
  });

  it('rejects a document belonging to another workspace', () => {
    const state = configuredState();
    expect(previewOfficeAgents(agents, state.current, 'workspace-b')).toEqual({
      success: false,
      code: 'workspace_mismatch',
    });
  });
});
