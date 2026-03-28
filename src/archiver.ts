import { App, Notice, TFolder } from 'obsidian';
import { ARCHIVE_ROOT, COMPLETION_DATE_FIELD } from './types';
import { computeArchiveTarget, resolveArchiveYear, todayDateString } from './utils';

export async function stampCompletionDate(
  app: App,
  file: { path: string },
  frontmatter: Record<string, unknown> | null | undefined,
  normalizedStatus: string
): Promise<void> {
  if (normalizedStatus !== 'complete') return;
  if (frontmatter?.[COMPLETION_DATE_FIELD]) return;
  const tf = app.vault.getAbstractFileByPath(file.path);
  if (tf && 'stat' in tf) {
    await app.fileManager.processFrontMatter(
      tf as Parameters<typeof app.fileManager.processFrontMatter>[0],
      (fm) => { fm[COMPLETION_DATE_FIELD] = todayDateString(); }
    );
  }
}

export async function archiveProject(
  app: App,
  file: { path: string; name: string },
  frontmatter: Record<string, unknown> | null | undefined,
  normalizedStatus: string
): Promise<void> {
  const year = resolveArchiveYear(frontmatter);
  const { target, warn } = computeArchiveTarget(file.path, year);

  if (warn) {
    new Notice(
      `Project Manager: "${file.name}" must be inside a named subfolder to be auto-archived. ` +
        `Move it to Projects/Active/${file.name.replace(/\.md$/, '')}/${file.name} first.`
    );
    return;
  }

  if (!target) {
    return;
  }

  await stampCompletionDate(app, file, frontmatter, normalizedStatus);

  // Ensure year folder exists
  const yearFolderPath = `${ARCHIVE_ROOT}/${year}`;
  if (!app.vault.getAbstractFileByPath(yearFolderPath)) {
    await app.vault.createFolder(yearFolderPath);
  }

  // Move the folder
  const folder = app.vault.getAbstractFileByPath(target.sourcePath);
  if (!(folder instanceof TFolder)) {
    console.error(`Project Manager: expected a folder at "${target.sourcePath}" but found something else.`);
    return;
  }

  // Check for destination collision (e.g. case-insensitive filesystem clash)
  if (app.vault.getAbstractFileByPath(target.destPath)) {
    new Notice(
      `Project Manager: cannot archive "${target.projectName}" — ` +
        `"${target.destPath}" already exists. Rename the project folder or move the existing archive.`
    );
    return;
  }

  try {
    await app.vault.rename(folder, target.destPath);
    new Notice(`Project Manager: archived "${target.projectName}" to ${yearFolderPath}/`);
  } catch (err) {
    new Notice(`Project Manager: failed to archive "${target.projectName}". Check the console for details.`);
    console.error(`Project Manager: failed to archive "${target.projectName}"`, err);
  }
}
