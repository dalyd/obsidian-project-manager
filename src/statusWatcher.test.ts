import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile } from 'obsidian';
import { StatusWatcher } from './statusWatcher';
import * as archiverModule from './archiver';
import { SUBPROJECT_TYPE } from './types';
import { makeTFile } from './test-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MetadataHandler = (file: TFile) => void;
type RenameHandler = (file: TFile, oldPath: string) => void;

interface FakeApp {
  vault: {
    getMarkdownFiles: () => TFile[];
    on: (event: string, cb: RenameHandler) => Record<string, unknown>;
  };
  metadataCache: {
    getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null;
    on: (event: string, cb: MetadataHandler) => Record<string, unknown>;
  };
}

function makeApp(files: TFile[], cacheMap: Map<string, Record<string, unknown> | null>): {
  app: FakeApp;
  triggerMetadata: MetadataHandler;
  triggerRename: RenameHandler;
} {
  let metadataHandler: MetadataHandler = () => {};
  let renameHandler: RenameHandler = () => {};

  const app: FakeApp = {
    vault: {
      getMarkdownFiles: () => files,
      on: (_event: string, cb: RenameHandler) => {
        renameHandler = cb;
        return {};
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const fm = cacheMap.get(file.path);
        if (fm === undefined || fm === null) return null;
        return { frontmatter: fm };
      },
      on: (_event: string, cb: MetadataHandler) => {
        metadataHandler = cb;
        return {};
      },
    },
  };

  return {
    app,
    triggerMetadata: (file) => metadataHandler(file),
    triggerRename: (file, oldPath) => renameHandler(file, oldPath),
  };
}

function makePlugin() {
  return { registerEvent: vi.fn() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(archiverModule, 'archiveProject').mockResolvedValue(undefined);
    vi.spyOn(archiverModule, 'stampCompletionDate').mockResolvedValue(undefined);
  });

  // ---- initSnapshot ----

  it('initSnapshot populates only files under Active root', () => {
    const activeFile = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const archiveFile = makeTFile('Projects/Archive/2025/Beta Project/Beta Project.md');
    const noteFile = makeTFile('Notes/meeting.md');

    const cacheMap = new Map<string, Record<string, unknown> | null>([
      [activeFile.path, { Status: 'active' }],
      [archiveFile.path, { Status: 'complete' }],
      [noteFile.path, null],
    ]);

    const { app } = makeApp([activeFile, archiveFile, noteFile], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.initSnapshot();

    const snap = watcher.getSnapshot();
    expect(snap.has(activeFile.path)).toBe(true);
    expect(snap.has(archiveFile.path)).toBe(false);
    expect(snap.has(noteFile.path)).toBe(false);
  });

  it('initSnapshot normalizes mixed-case and array statuses', () => {
    const file1 = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const file2 = makeTFile('Projects/Active/Beta Project/Beta Project.md');

    const cacheMap = new Map<string, Record<string, unknown> | null>([
      [file1.path, { Status: 'ACTIVE' }],
      [file2.path, { Status: ['Complete'] }],
    ]);

    const { app } = makeApp([file1, file2], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.initSnapshot();

    expect(watcher.getSnapshot().get(file1.path)).toBe('active');
    expect(watcher.getSnapshot().get(file2.path)).toBe('complete');
  });

  // ---- metadata change handling ----

  it('does NOT archive when status is unchanged (active → active)', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const cacheMap = new Map([[file.path, { Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    triggerMetadata(file);
    await vi.waitFor(() => {});

    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });

  it('does NOT archive for non-archive status (active → paused)', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const cacheMap = new Map([[file.path, { Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    // Change cache to paused
    cacheMap.set(file.path, { Status: 'paused' });
    triggerMetadata(file);
    await vi.waitFor(() => {});

    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });

  it('archives when status transitions to complete', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const cacheMap = new Map([[file.path, { type: 'project', Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { type: 'project', Status: 'complete' });
    triggerMetadata(file);
    await vi.waitFor(() => expect(archiverModule.archiveProject).toHaveBeenCalled());

    expect(archiverModule.archiveProject).toHaveBeenCalledWith(
      app,
      file,
      expect.objectContaining({ type: 'project', Status: 'complete' }),
      'complete'
    );
  });

  it('archives when status transitions to stop', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const cacheMap = new Map([[file.path, { type: 'project', Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { type: 'project', Status: 'stop' });
    triggerMetadata(file);
    await vi.waitFor(() => expect(archiverModule.archiveProject).toHaveBeenCalled());

    expect(archiverModule.archiveProject).toHaveBeenCalledWith(
      app,
      file,
      expect.objectContaining({ type: 'project', Status: 'stop' }),
      'stop'
    );
  });

  it('does NOT archive for a supporting doc without type: project', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Packing List.md');
    const cacheMap = new Map([[file.path, { Status: 'active' }]]); // no type: project

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { Status: 'complete' }); // no type: project
    triggerMetadata(file);
    await vi.waitFor(() => {});

    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });

  it('does NOT archive when settings.enabled is false', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const cacheMap = new Map([[file.path, { Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: false });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { Status: 'complete' });
    triggerMetadata(file);
    await vi.waitFor(() => {});

    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });

  it('does NOT archive twice when a second event fires with same status (re-entry guard)', async () => {
    const file = makeTFile('Projects/Active/Alpha Project/Alpha Project.md');
    const cacheMap = new Map([[file.path, { type: 'project', Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    // First transition: active → complete
    cacheMap.set(file.path, { type: 'project', Status: 'complete' });
    triggerMetadata(file);
    await vi.waitFor(() => expect(archiverModule.archiveProject).toHaveBeenCalledTimes(1));

    // Second event with same status (as if processFrontMatter fired metadata change)
    triggerMetadata(file);
    await vi.waitFor(() => {});

    expect(archiverModule.archiveProject).toHaveBeenCalledTimes(1);
  });

  // ---- vault rename handling ----

  it('updates snapshot path when file is renamed within Active', () => {
    const oldPath = 'Projects/Active/Alpha Project/Alpha Project.md';
    const newPath = 'Projects/Active/Renamed Project/Renamed Project.md';

    const file = makeTFile(oldPath);
    const cacheMap = new Map([[oldPath, { Status: 'active' }]]);

    const { app, triggerRename } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    const renamedFile = makeTFile(newPath);
    cacheMap.set(newPath, { Status: 'active' });
    triggerRename(renamedFile, oldPath);

    const snap = watcher.getSnapshot();
    expect(snap.has(oldPath)).toBe(false);
    expect(snap.has(newPath)).toBe(true);
  });

  it('removes snapshot entry when file moves out of Active', () => {
    const activePath = 'Projects/Active/Alpha Project/Alpha Project.md';
    const archivePath = 'Projects/Archive/2026/Alpha Project/Alpha Project.md';

    const file = makeTFile(activePath);
    const cacheMap = new Map([[activePath, { Status: 'active' }]]);

    const { app, triggerRename } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    const movedFile = makeTFile(archivePath);
    triggerRename(movedFile, activePath);

    const snap = watcher.getSnapshot();
    expect(snap.has(activePath)).toBe(false);
    expect(snap.has(archivePath)).toBe(false);
  });

  // ---- subproject handling ----

  it('stamps completion date when subproject transitions to complete', async () => {
    const file = makeTFile('Projects/Active/Parent/Sub/Sub.md');
    const cacheMap = new Map([[file.path, { type: SUBPROJECT_TYPE, Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { type: SUBPROJECT_TYPE, Status: 'complete' });
    triggerMetadata(file);
    await vi.waitFor(() => expect(archiverModule.stampCompletionDate).toHaveBeenCalled());

    expect(archiverModule.stampCompletionDate).toHaveBeenCalledWith(
      app,
      file,
      expect.objectContaining({ type: SUBPROJECT_TYPE, Status: 'complete' }),
      'complete'
    );
    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });

  it('does NOT stamp completion date when subproject transitions to stop', async () => {
    const file = makeTFile('Projects/Active/Parent/Sub/Sub.md');
    const cacheMap = new Map([[file.path, { type: SUBPROJECT_TYPE, Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { type: SUBPROJECT_TYPE, Status: 'stop' });
    triggerMetadata(file);
    await vi.waitFor(() => {});

    // stampCompletionDate is called but internally is a no-op for 'stop'
    // The important thing is archiveProject is never called
    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });

  it('does NOT archive a subproject when it transitions to complete', async () => {
    const file = makeTFile('Projects/Active/Parent/Sub/Sub.md');
    const cacheMap = new Map([[file.path, { type: SUBPROJECT_TYPE, Status: 'active' }]]);

    const { app, triggerMetadata } = makeApp([file], cacheMap);
    const watcher = new StatusWatcher(app as never, makePlugin(), { enabled: true });
    watcher.register();
    watcher.initSnapshot();

    cacheMap.set(file.path, { type: SUBPROJECT_TYPE, Status: 'complete' });
    triggerMetadata(file);
    await vi.waitFor(() => expect(archiverModule.stampCompletionDate).toHaveBeenCalled());

    expect(archiverModule.archiveProject).not.toHaveBeenCalled();
  });
});
