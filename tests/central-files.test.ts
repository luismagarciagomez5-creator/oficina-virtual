import { describe, expect, it } from 'vitest';
import {
  applyFileCommand,
  canAgentReadFile,
  createCentralFileState,
  createFileIndexRequest,
  createFileUploadRequest,
  selectFileVersions,
  validateFileCommand,
} from '../src/central-files';
import type { CentralFileState, FileActor, FileCommand } from '../src/central-files';

const WORKSPACE_ID = 'workspace-demo';
const ACTOR: FileActor = { actorId: 'admin', role: 'workspace_admin', workspaceId: WORKSPACE_ID };

function apply(state: CentralFileState, command: FileCommand): CentralFileState {
  const result = applyFileCommand(state, command);
  if (!result.success) throw new Error(result.code);
  return result.state;
}

function createCommand(overrides: Partial<FileCommand> = {}): FileCommand {
  return {
    type: 'file.created', commandId: 'file-create', documentId: 'file-1', versionId: 'version-1',
    workspaceId: WORKSPACE_ID, actor: ACTOR, occurredAt: '2026-07-16T08:00:00.000Z', folderId: null,
    name: 'Catálogo', source: 'upload', sensitivity: 'normal', access: { allAgents: true, allowedAgentIds: [] },
    filename: 'catalogo.pdf', mimeType: 'application/pdf', sizeBytes: 10_000,
    ...overrides,
  } as FileCommand;
}

describe('central files', () => {
  it('tracks upload and indexing without storing file bytes in state', () => {
    let state = apply(createCentralFileState(WORKSPACE_ID), createCommand());
    expect(createFileUploadRequest(state, 'file-1')).toMatchObject({ objectKey: 'workspace-demo/file-1/v1/catalogo.pdf' });
    state = apply(state, {
      type: 'file.upload_completed', commandId: 'file-stored', documentId: 'file-1', versionId: 'version-1',
      workspaceId: WORKSPACE_ID, expectedRevision: 1, actor: ACTOR, occurredAt: '2026-07-16T08:01:00.000Z',
      storageKey: 'workspace-demo/file-1/catalogo.pdf', checksum: 'sha256-demo',
    });
    expect(createFileIndexRequest(state, 'file-1')).toMatchObject({ sensitivity: 'normal', checksum: 'sha256-demo' });
    state = apply(state, {
      type: 'file.indexed', commandId: 'file-indexed', documentId: 'file-1', versionId: 'version-1',
      workspaceId: WORKSPACE_ID, expectedRevision: 2, actor: ACTOR, occurredAt: '2026-07-16T08:02:00.000Z', chunkCount: 3,
    });
    expect(state.documents['file-1']).toMatchObject({ status: 'available', revision: 3 });
    expect(canAgentReadFile(state.documents['file-1'], 'content')).toBe(true);
  });

  it('preserves versions and enforces per-agent access', () => {
    let state = apply(createCentralFileState(WORKSPACE_ID), createCommand());
    state = apply(state, {
      type: 'file.upload_completed', commandId: 'stored-v1', documentId: 'file-1', versionId: 'version-1',
      workspaceId: WORKSPACE_ID, expectedRevision: 1, actor: ACTOR, occurredAt: '2026-07-16T08:01:00.000Z', storageKey: 'key-v1', checksum: 'sum-v1',
    });
    state = apply(state, {
      type: 'file.indexed', commandId: 'indexed-v1', documentId: 'file-1', versionId: 'version-1',
      workspaceId: WORKSPACE_ID, expectedRevision: 2, actor: ACTOR, occurredAt: '2026-07-16T08:02:00.000Z', chunkCount: 2,
    });
    state = apply(state, {
      type: 'file.access_updated', commandId: 'access-v1', documentId: 'file-1', workspaceId: WORKSPACE_ID,
      expectedRevision: 3, actor: ACTOR, occurredAt: '2026-07-16T08:03:00.000Z', sensitivity: 'restricted',
      access: { allAgents: false, allowedAgentIds: ['coordinator'] },
    });
    expect(canAgentReadFile(state.documents['file-1'], 'coordinator')).toBe(true);
    expect(canAgentReadFile(state.documents['file-1'], 'content')).toBe(false);
    state = apply(state, {
      type: 'file.version_created', commandId: 'version-v2', documentId: 'file-1', versionId: 'version-2',
      workspaceId: WORKSPACE_ID, expectedRevision: 4, actor: ACTOR, occurredAt: '2026-07-16T08:04:00.000Z',
      filename: 'catalogo-v2.pdf', mimeType: 'application/pdf', sizeBytes: 12_000,
    });
    expect(selectFileVersions(state, 'file-1').map((version) => version.version)).toEqual([2, 1]);
  });

  it('rejects cross-workspace, unauthorized and stale commands', () => {
    const state = createCentralFileState(WORKSPACE_ID);
    expect(applyFileCommand(state, createCommand({ workspaceId: 'workspace-other' }))).toEqual({ success: false, code: 'workspace_mismatch' });
    expect(applyFileCommand(state, createCommand({ actor: { actorId: 'member', role: 'workspace_member', workspaceId: WORKSPACE_ID } }))).toEqual({ success: false, code: 'unauthorized' });
    const created = apply(state, createCommand());
    expect(applyFileCommand(created, {
      type: 'file.deleted', commandId: 'stale-delete', documentId: 'file-1', workspaceId: WORKSPACE_ID,
      expectedRevision: 9, actor: ACTOR, occurredAt: '2026-07-16T08:05:00.000Z',
    })).toEqual({ success: false, code: 'stale_revision' });
  });

  it('prevents deleting non-empty folders and validates metadata limits', () => {
    let state = apply(createCentralFileState(WORKSPACE_ID), {
      type: 'folder.created', commandId: 'folder-create', folderId: 'folder-1', parentId: null,
      workspaceId: WORKSPACE_ID, actor: ACTOR, occurredAt: '2026-07-16T08:00:00.000Z', name: 'Comercial',
    });
    state = apply(state, createCommand({ folderId: 'folder-1' }));
    expect(applyFileCommand(state, {
      type: 'folder.deleted', commandId: 'folder-delete', folderId: 'folder-1', expectedRevision: 1,
      workspaceId: WORKSPACE_ID, actor: ACTOR, occurredAt: '2026-07-16T08:05:00.000Z',
    })).toEqual({ success: false, code: 'folder_not_empty' });
    expect(validateFileCommand(createCommand()).success).toBe(true);
    const invalid = validateFileCommand(createCommand({ sizeBytes: 200 * 1024 * 1024 }));
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.issues.map((issue) => issue.path)).toContain('sizeBytes');
  });
});
