import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile, TFolder, Notice } from 'obsidian';
import { archiveProject } from './archiver';
import { makeTFile, makeTFolder } from './test-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApp({
  existingPaths = [] as string[],
  folderPath = '',
}: {
  existingPaths?: string[];
  folderPath?: string;
} = {}) {
  const createdFolders: string[] = [];
  const renamedItems: Array<{ from: string; to: string }> = [];
  const processedFrontmatters: Array<{ path: string }> = [];

  const app = {
    vault: {
      getAbstractFileByPath: vi.fn((path: string) => {
        if (!existingPaths.includes(path)) return null;
        if (path === folderPath) return makeTFolder(path);
        return makeTFile(path);
      }),
      createFolder: vi.fn(async (path: string) => {
        createdFolders.push(path);
      }),
      rename: vi.fn(async (_item: TFile | TFolder, newPath: string) => {
        renamedItems.push({ from: (_item as TFolder).path, to: newPath });
      }),
    },
    fileManager: {
      processFrontMatter: vi.fn(async (file: TFile, fn: (fm: Record<string, unknown>) => void) => {
        const fm: Record<string, unknown> = {};
        fn(fm);
        processedFrontmatters.push({ path: file.path });
      }),
    },
    _createdFolders: createdFolders,
    _renamedItems: renamedItems,
    _processedFrontmatters: processedFrontmatters,
  };

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('archiveProject', () => {
  const projectName = 'Alpha Project';
  const filePath = `Projects/Active/${projectName}/${projectName}.md`;
  const thisYear = new Date().getFullYear();

  // The folder path that should be moved
  const sourceFolderPath = `Projects/Active/${projectName}`;
  const destFolderPath = `Projects/Archive/${thisYear}/${projectName}`;
  const yearFolderPath = `Projects/Archive/${thisYear}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates year folder when it does not exist', async () => {
    const app = makeApp({ existingPaths: [sourceFolderPath], folderPath: sourceFolderPath });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.vault.createFolder).toHaveBeenCalledWith(yearFolderPath);
  });

  it('does NOT create year folder when it already exists', async () => {
    const app = makeApp({
      existingPaths: [sourceFolderPath, yearFolderPath],
      folderPath: sourceFolderPath,
    });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });

  it('calls vault.rename with the source folder and correct dest path', async () => {
    const app = makeApp({ existingPaths: [sourceFolderPath], folderPath: sourceFolderPath });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.vault.rename).toHaveBeenCalledWith(
      expect.objectContaining({ path: sourceFolderPath }),
      destFolderPath
    );
  });

  it('calls processFrontMatter when status=complete and no completion date', async () => {
    const app = makeApp({ existingPaths: [sourceFolderPath, filePath], folderPath: sourceFolderPath });
    // Simulate file lookup returning a TFile (has 'stat')
    app.vault.getAbstractFileByPath = vi.fn((path: string) => {
      if (path === sourceFolderPath) return makeTFolder(sourceFolderPath);
      if (path === filePath) return makeTFile(filePath);
      return null;
    });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.fileManager.processFrontMatter).toHaveBeenCalled();
  });

  it('does NOT call processFrontMatter when status=stop', async () => {
    const app = makeApp({ existingPaths: [sourceFolderPath], folderPath: sourceFolderPath });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, {}, 'stop');
    expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
  });

  it('does NOT call processFrontMatter when completion date is already set', async () => {
    const app = makeApp({ existingPaths: [sourceFolderPath], folderPath: sourceFolderPath });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, { 'completion date': '2026-01-15' }, 'complete');
    expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
  });

  it('shows a Notice and does NOT rename for a standalone file directly in Active', async () => {
    const standalonePath = 'Projects/Active/Standalone Task.md';
    const app = makeApp({ existingPaths: [] });
    const file = makeTFile(standalonePath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.vault.rename).not.toHaveBeenCalled();
  });

  it('does NOT rename when destination already exists and shows notice', async () => {
    const app = makeApp({
      existingPaths: [sourceFolderPath, yearFolderPath, destFolderPath],
      folderPath: sourceFolderPath,
    });
    // Make destFolderPath resolve to a folder too
    app.vault.getAbstractFileByPath = vi.fn((path: string) => {
      if (path === sourceFolderPath) return makeTFolder(sourceFolderPath);
      if (path === destFolderPath) return makeTFolder(destFolderPath);
      if (path === yearFolderPath) return makeTFolder(yearFolderPath);
      return null;
    });
    const file = makeTFile(filePath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.vault.rename).not.toHaveBeenCalled();
  });

  it('archives the parent folder even when filename does not match folder name', async () => {
    const folder = 'Website Redesign';
    const mismatchPath = `Projects/Active/${folder}/Build New Website.md`;
    const mismatchFolder = `Projects/Active/${folder}`;
    const app = makeApp({ existingPaths: [mismatchFolder], folderPath: mismatchFolder });
    const file = makeTFile(mismatchPath);
    await archiveProject(app as never, file, {}, 'complete');
    expect(app.vault.rename).toHaveBeenCalledWith(
      expect.objectContaining({ path: mismatchFolder }),
      `Projects/Archive/${thisYear}/${folder}`
    );
  });
});
