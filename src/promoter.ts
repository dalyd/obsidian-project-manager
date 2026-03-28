import { App, TFile } from 'obsidian';
import { computePromoteTarget } from './utils';

/**
 * Returns all markdown files directly in Projects/Active/ (no subfolder).
 */
export function findStandaloneProjects(app: App): TFile[] {
  return app.vault.getMarkdownFiles().filter((f) => computePromoteTarget(f.path) !== null);
}

/**
 * Creates the subfolder and moves the file into it.
 * Returns true on success, false if the file is not a standalone project.
 */
export async function promoteToSubfolder(app: App, file: TFile): Promise<boolean> {
  const target = computePromoteTarget(file.path);
  if (!target) return false;

  await app.vault.createFolder(target.folderPath);
  await app.vault.rename(file, target.destFilePath);
  return true;
}
