import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, TFile, TFolder } from 'obsidian';
import {
  computeAttachTarget,
  computeBreakoutTarget,
  attachAsSubproject,
  breakOutSubproject,
} from './subproject';
import { makeTFile, makeTFolder } from './test-helpers';

// ---------------------------------------------------------------------------
// computeAttachTarget
// ---------------------------------------------------------------------------
describe('computeAttachTarget', () => {
  it('returns correct paths for a depth-2 file', () => {
    const result = computeAttachTarget(
      'Projects/Active/Sub/Sub.md',
      'Projects/Active/Parent'
    );
    expect(result).not.toBeNull();
    expect(result!.sourceFolder).toBe('Projects/Active/Sub');
    expect(result!.destFolder).toBe('Projects/Active/Parent/Sub');
    expect(result!.projectName).toBe('Sub');
  });

  it('returns null for a depth-1 file (standalone)', () => {
    expect(computeAttachTarget('Projects/Active/Sub.md', 'Projects/Active/Parent')).toBeNull();
  });

  it('returns null for a depth-3 file (already a subproject)', () => {
    expect(
      computeAttachTarget('Projects/Active/Parent/Sub/Sub.md', 'Projects/Active/Other')
    ).toBeNull();
  });

  it('returns null for a file not under Active', () => {
    expect(
      computeAttachTarget('Projects/Archive/2025/Sub/Sub.md', 'Projects/Active/Parent')
    ).toBeNull();
  });

  it('uses folder name when file name does not match folder', () => {
    const result = computeAttachTarget(
      'Projects/Active/OldFolder/RenamedFile.md',
      'Projects/Active/Parent'
    );
    expect(result).not.toBeNull();
    expect(result!.sourceFolder).toBe('Projects/Active/OldFolder');
    expect(result!.destFolder).toBe('Projects/Active/Parent/OldFolder');
    expect(result!.projectName).toBe('OldFolder');
  });
});

// ---------------------------------------------------------------------------
// computeBreakoutTarget
// ---------------------------------------------------------------------------
describe('computeBreakoutTarget', () => {
  it('returns correct paths for a depth-3 file', () => {
    const result = computeBreakoutTarget(
      'Projects/Active/Marathon Training/Strength Program/Strength Program.md'
    );
    expect(result).not.toBeNull();
    expect(result!.sourceFolder).toBe(
      'Projects/Active/Marathon Training/Strength Program'
    );
    expect(result!.destFolder).toBe('Projects/Active/Strength Program');
    expect(result!.projectName).toBe('Strength Program');
  });

  it('returns null for a depth-2 file (top-level project)', () => {
    expect(
      computeBreakoutTarget('Projects/Active/Marathon Training/Marathon Training.md')
    ).toBeNull();
  });

  it('returns null for a file not under Active', () => {
    expect(
      computeBreakoutTarget('Projects/Archive/2025/Parent/Sub/Sub.md')
    ).toBeNull();
  });

  it('uses folder name when file name does not match folder', () => {
    const result = computeBreakoutTarget(
      'Projects/Active/Parent/OldFolder/RenamedFile.md'
    );
    expect(result).not.toBeNull();
    expect(result!.sourceFolder).toBe('Projects/Active/Parent/OldFolder');
    expect(result!.destFolder).toBe('Projects/Active/OldFolder');
    expect(result!.projectName).toBe('OldFolder');
  });
});

// ---------------------------------------------------------------------------
// attachAsSubproject
// ---------------------------------------------------------------------------
describe('attachAsSubproject', () => {
  let app: App;
  const file = makeTFile('Projects/Active/Sub/Sub.md');
  const parentFile = makeTFile('Projects/Active/Parent/Parent.md');
  let movedFile: TFile;

  beforeEach(() => {
    app = new App();
    movedFile = makeTFile('Projects/Active/Parent/Sub/Sub.md');
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Sub') return makeTFolder('Projects/Active/Sub');
      if (path === 'Projects/Active/Parent/Sub/Sub.md') return movedFile;
      return null;
    });
    vi.spyOn(app.vault, 'rename').mockResolvedValue(undefined);
    vi.spyOn(app.fileManager, 'processFrontMatter').mockResolvedValue(undefined);
  });

  it('calls vault.rename with correct source and dest', async () => {
    const result = await attachAsSubproject(app, file, parentFile);
    expect(result).toBe(true);
    expect(app.vault.rename).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Projects/Active/Sub' }),
      'Projects/Active/Parent/Sub'
    );
  });

  it('calls processFrontMatter to set type: subproject', async () => {
    const fm: Record<string, unknown> = {};
    vi.spyOn(app.fileManager, 'processFrontMatter').mockImplementation(async (_file, fn) => {
      fn(fm);
    });

    await attachAsSubproject(app, file, parentFile);
    expect(fm['type']).toBe('subproject');
  });

  it('returns false for a non-depth-2 file', async () => {
    const depth3File = makeTFile('Projects/Active/Parent/Sub/Sub.md');
    const result = await attachAsSubproject(app, depth3File, parentFile);
    expect(result).toBe(false);
  });

  it('returns false when folder not found', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
    const result = await attachAsSubproject(app, file, parentFile);
    expect(result).toBe(false);
  });

  it('works when file name does not match folder name', async () => {
    const mismatchedFile = makeTFile('Projects/Active/OldFolder/RenamedFile.md');
    const movedMismatchedFile = makeTFile('Projects/Active/Parent/OldFolder/RenamedFile.md');
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/OldFolder') return makeTFolder('Projects/Active/OldFolder');
      if (path === 'Projects/Active/Parent/OldFolder/RenamedFile.md') return movedMismatchedFile;
      return null;
    });
    const fm: Record<string, unknown> = {};
    vi.spyOn(app.fileManager, 'processFrontMatter').mockImplementation(async (_file, fn) => {
      fn(fm);
    });

    const result = await attachAsSubproject(app, mismatchedFile, parentFile);
    expect(result).toBe(true);
    expect(app.vault.rename).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Projects/Active/OldFolder' }),
      'Projects/Active/Parent/OldFolder'
    );
    expect(fm['type']).toBe('subproject');
  });

  it('returns false when destination already exists', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Sub') return makeTFolder('Projects/Active/Sub');
      if (path === 'Projects/Active/Parent/Sub') return makeTFolder('Projects/Active/Parent/Sub');
      return null;
    });

    const result = await attachAsSubproject(app, file, parentFile);
    expect(result).toBe(false);
    expect(app.vault.rename).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// breakOutSubproject
// ---------------------------------------------------------------------------
describe('breakOutSubproject', () => {
  let app: App;
  const file = makeTFile('Projects/Active/Parent/Sub/Sub.md');
  let movedFile: TFile;

  beforeEach(() => {
    app = new App();
    movedFile = makeTFile('Projects/Active/Sub/Sub.md');
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Parent/Sub')
        return makeTFolder('Projects/Active/Parent/Sub');
      if (path === 'Projects/Active/Sub/Sub.md') return movedFile;
      return null;
    });
    vi.spyOn(app.vault, 'rename').mockResolvedValue(undefined);
    vi.spyOn(app.fileManager, 'processFrontMatter').mockResolvedValue(undefined);
  });

  it('calls vault.rename with correct source and dest', async () => {
    const result = await breakOutSubproject(app, file);
    expect(result).toBe(true);
    expect(app.vault.rename).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Projects/Active/Parent/Sub' }),
      'Projects/Active/Sub'
    );
  });

  it('calls processFrontMatter to set type: project', async () => {
    const fm: Record<string, unknown> = { type: 'subproject' };
    vi.spyOn(app.fileManager, 'processFrontMatter').mockImplementation(async (_file, fn) => {
      fn(fm);
    });

    await breakOutSubproject(app, file);
    expect(fm['type']).toBe('project');
  });

  it('returns false for a depth-2 file (not a subproject)', async () => {
    const depth2File = makeTFile('Projects/Active/Parent/Parent.md');
    const result = await breakOutSubproject(app, depth2File);
    expect(result).toBe(false);
  });

  it('returns false when folder not found', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
    const result = await breakOutSubproject(app, file);
    expect(result).toBe(false);
  });

  it('works when file name does not match folder name', async () => {
    const mismatchedFile = makeTFile('Projects/Active/Parent/OldFolder/RenamedFile.md');
    const movedMismatchedFile = makeTFile('Projects/Active/OldFolder/RenamedFile.md');
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Parent/OldFolder')
        return makeTFolder('Projects/Active/Parent/OldFolder');
      if (path === 'Projects/Active/OldFolder/RenamedFile.md') return movedMismatchedFile;
      return null;
    });
    const fm: Record<string, unknown> = { type: 'subproject' };
    vi.spyOn(app.fileManager, 'processFrontMatter').mockImplementation(async (_file, fn) => {
      fn(fm);
    });

    const result = await breakOutSubproject(app, mismatchedFile);
    expect(result).toBe(true);
    expect(app.vault.rename).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Projects/Active/Parent/OldFolder' }),
      'Projects/Active/OldFolder'
    );
    expect(fm['type']).toBe('project');
  });

  it('returns false when destination already exists', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Parent/Sub')
        return makeTFolder('Projects/Active/Parent/Sub');
      if (path === 'Projects/Active/Sub') return makeTFolder('Projects/Active/Sub');
      return null;
    });

    const result = await breakOutSubproject(app, file);
    expect(result).toBe(false);
    expect(app.vault.rename).not.toHaveBeenCalled();
  });
});
