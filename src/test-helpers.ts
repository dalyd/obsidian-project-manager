import { TFile, TFolder } from 'obsidian';

/**
 * Create a mock TFile. The real obsidian TFile has no public constructor,
 * but our test mock (src/__mocks__/obsidian.ts) accepts a path. This
 * helper isolates the cast so test files stay clean for the LSP.
 */
export function makeTFile(path: string): TFile {
  return new (TFile as any)(path);
}

/**
 * Create a mock TFolder, optionally with children.
 */
export function makeTFolder(path: string, children: Array<TFile | TFolder> = []): TFolder {
  const folder = new (TFolder as any)(path);
  folder.children = children;
  return folder;
}
