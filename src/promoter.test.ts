import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, TFile } from './__mocks__/obsidian';
import { findStandaloneProjects, promoteToSubfolder } from './promoter';
import { makeTFile } from './test-helpers';

function makeApp(files: TFile[]): App {
  const app = new App();
  app.vault.getMarkdownFiles = () => files;
  return app;
}

describe('findStandaloneProjects', () => {
  it('returns only standalone files directly in Active', () => {
    const standalone = makeTFile('Projects/Active/Marathon Training.md');
    const inSubfolder = makeTFile('Projects/Active/Marathon Training/Marathon Training.md');
    const inArchive = makeTFile('Projects/Archive/2025/Marathon Training/Marathon Training.md');
    const unrelated = makeTFile('Notes/meeting.md');

    const app = makeApp([standalone, inSubfolder, inArchive, unrelated]);
    const result = findStandaloneProjects(app as unknown as import('obsidian').App);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('Projects/Active/Marathon Training.md');
  });

  it('returns multiple standalone files', () => {
    const files = [
      makeTFile('Projects/Active/Marathon Training.md'),
      makeTFile('Projects/Active/Plan Office Renovation.md'),
      makeTFile('Projects/Active/Marathon Training/Marathon Training.md'),
    ];
    const app = makeApp(files);
    const result = findStandaloneProjects(app as unknown as import('obsidian').App);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no standalone files exist', () => {
    const files = [makeTFile('Projects/Active/Marathon Training/Marathon Training.md')];
    const app = makeApp(files);
    const result = findStandaloneProjects(app as unknown as import('obsidian').App);
    expect(result).toHaveLength(0);
  });
});

describe('promoteToSubfolder', () => {
  it('calls createFolder and rename with correct paths', async () => {
    const file = makeTFile('Projects/Active/Marathon Training.md');
    const app = new App();
    const createFolder = vi.fn().mockResolvedValue(undefined);
    const rename = vi.fn().mockResolvedValue(undefined);
    app.vault.createFolder = createFolder;
    app.vault.rename = rename as unknown as typeof app.vault.rename;

    const result = await promoteToSubfolder(app as unknown as import('obsidian').App, file as unknown as import('obsidian').TFile);

    expect(result).toBe(true);
    expect(createFolder).toHaveBeenCalledWith('Projects/Active/Marathon Training');
    expect(rename).toHaveBeenCalledWith(file, 'Projects/Active/Marathon Training/Marathon Training.md');
  });

  it('returns false without calling API for a file already in subfolder', async () => {
    const file = makeTFile('Projects/Active/Marathon Training/Marathon Training.md');
    const app = new App();
    const createFolder = vi.fn();
    const rename = vi.fn();
    app.vault.createFolder = createFolder;
    app.vault.rename = rename as unknown as typeof app.vault.rename;

    const result = await promoteToSubfolder(app as unknown as import('obsidian').App, file as unknown as import('obsidian').TFile);

    expect(result).toBe(false);
    expect(createFolder).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });

  it('returns false for a file not under Active', async () => {
    const file = makeTFile('Notes/meeting.md');
    const app = new App();
    const createFolder = vi.fn();
    app.vault.createFolder = createFolder;

    const result = await promoteToSubfolder(app as unknown as import('obsidian').App, file as unknown as import('obsidian').TFile);

    expect(result).toBe(false);
    expect(createFolder).not.toHaveBeenCalled();
  });
});
