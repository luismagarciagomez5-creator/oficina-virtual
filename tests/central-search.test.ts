import { describe, expect, it } from 'vitest';
import { searchWorkspace } from '../src/central-search';
import type { GlobalSearchSources } from '../src/central-search';
import { adaptSaasContact360, createSaasContact360Fixture } from '../src/central-contacts';
import { createHistoricalOfficeFeed } from '../src/central-events';
import { createInboxProjectionFixture, projectInboxThread } from '../src/central-inbox';
import { createCentralMemoryState, createMemoryFixtures, reduceMemoryMutations, selectMemoryProfiles } from '../src/central-memory';
import { applyRoutineCommand, createCentralRoutineState, createRoutineFixtures } from '../src/central-routines';
import { applyTaskCommand, createCentralTaskState, createTaskFixtures } from '../src/central-tasks';

const WORKSPACE_ID = 'workspace-demo';
const ACTOR = { actorId: 'admin', role: 'workspace_admin' as const, workspaceId: WORKSPACE_ID };

function sources(): GlobalSearchSources {
  const contact = adaptSaasContact360(createSaasContact360Fixture());
  const conversation = projectInboxThread(createInboxProjectionFixture());
  let taskState = createCentralTaskState(WORKSPACE_ID);
  for (const command of createTaskFixtures(WORKSPACE_ID)) {
    const result = applyTaskCommand(taskState, command);
    if (result.success) taskState = result.state;
  }
  let routineState = createCentralRoutineState(WORKSPACE_ID);
  for (const command of createRoutineFixtures(WORKSPACE_ID)) {
    const result = applyRoutineCommand(routineState, command);
    if (result.success) routineState = result.state;
  }
  const memory = reduceMemoryMutations(createMemoryFixtures(), createCentralMemoryState());
  return {
    contacts: contact.success ? [contact.contact] : [],
    conversations: conversation.success ? [conversation.thread] : [],
    tasks: Object.values(taskState.tasks),
    routines: Object.values(routineState.routines),
    memories: selectMemoryProfiles(memory),
    activities: createHistoricalOfficeFeed(WORKSPACE_ID, new Date('2026-07-15T12:00:00.000Z'), 1),
  };
}

describe('workspace global search', () => {
  it('finds and ranks matching entities across categories', () => {
    const response = searchWorkspace(ACTOR, { workspaceId: WORKSPACE_ID, query: 'Lucía' }, sources());
    expect(response.success).toBe(true);
    if (!response.success) return;
    expect(response.results.map((result) => result.category)).toEqual(expect.arrayContaining(['contact', 'conversation', 'memory']));
    expect(response.results[0].title).toContain('Luc');
  });

  it('filters by category and treats accents as equivalent', () => {
    const response = searchWorkspace(ACTOR, {
      workspaceId: WORKSPACE_ID, query: 'revision', categories: ['routine'],
    }, sources());
    expect(response.success).toBe(true);
    if (response.success) expect(response.results).toEqual([expect.objectContaining({ category: 'routine', id: 'routine:routine-weekly-quality' })]);
  });

  it('rejects actors and sources from a different workspace', () => {
    expect(searchWorkspace(
      { actorId: 'other', role: 'workspace_member', workspaceId: 'workspace-other' },
      { workspaceId: WORKSPACE_ID, query: 'lead' }, sources(),
    )).toEqual({ success: false, error: 'unauthorized' });
    const mixed = sources();
    mixed.activities[0] = { ...mixed.activities[0], workspaceId: 'workspace-other' };
    expect(searchWorkspace(ACTOR, { workspaceId: WORKSPACE_ID, query: 'lead' }, mixed)).toEqual({ success: false, error: 'workspace_mismatch' });
  });

  it('does not expose sensitive memory content to workspace members', () => {
    const data = sources();
    const sensitive = data.memories.flatMap((profile) => profile.items).find((item) => item.sensitivity === 'sensitive');
    expect(sensitive).toBeDefined();
    if (!sensitive) return;
    const response = searchWorkspace(
      { actorId: 'member', role: 'workspace_member', workspaceId: WORKSPACE_ID },
      { workspaceId: WORKSPACE_ID, query: sensitive.value, includeSensitiveMemory: true, categories: ['memory'] },
      data,
    );
    expect(response).toMatchObject({ success: true, results: [] });
  });
});
