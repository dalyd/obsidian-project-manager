import { App, Notice, TFile, TFolder } from 'obsidian';
import { ACTIVE_ROOT, SUBPROJECT_TYPE, PROJECT_TYPE } from './types';
import { isDepth2UnderActive, isDepth3UnderActive } from './utils';

export interface SubprojectMoveTarget {
  sourceFolder: string;
  destFolder: string;
  projectName: string;
}

export function computeAttachTarget(
  filePath: string,
  parentFolderPath: string
): SubprojectMoveTarget | null {
  if (!isDepth2UnderActive(filePath)) return null;

  // filePath: Projects/Active/Sub/Sub.md  → sourceFolder: Projects/Active/Sub
  const parts = filePath.split('/');
  const projectName = parts[parts.length - 2]; // folder name
  const sourceFolder = `${ACTIVE_ROOT}/${projectName}`;
  const destFolder = `${parentFolderPath}/${projectName}`;

  return { sourceFolder, destFolder, projectName };
}

export function computeBreakoutTarget(filePath: string): SubprojectMoveTarget | null {
  if (!isDepth3UnderActive(filePath)) return null;

  // filePath: Projects/Active/Parent/Sub/Sub.md
  const parts = filePath.split('/');
  const projectName = parts[parts.length - 2]; // Sub
  const parentName = parts[parts.length - 3];  // Parent
  const sourceFolder = `${ACTIVE_ROOT}/${parentName}/${projectName}`;
  const destFolder = `${ACTIVE_ROOT}/${projectName}`;

  return { sourceFolder, destFolder, projectName };
}

export async function attachAsSubproject(
  app: App,
  file: TFile,
  parentFile: TFile
): Promise<boolean> {
  const parentFolderPath = parentFile.path.split('/').slice(0, -1).join('/');
  const target = computeAttachTarget(file.path, parentFolderPath);
  if (!target) return false;

  const folder = app.vault.getAbstractFileByPath(target.sourceFolder);
  if (!(folder instanceof TFolder)) return false;

  if (app.vault.getAbstractFileByPath(target.destFolder)) {
    new Notice(`A project named "${target.projectName}" already exists under that parent.`);
    return false;
  }

  await app.vault.rename(folder, target.destFolder);

  // Update the file's new path after rename
  const newFilePath = `${target.destFolder}/${file.name}`;
  const movedFile = app.vault.getAbstractFileByPath(newFilePath);
  if (movedFile instanceof TFile) {
    await app.fileManager.processFrontMatter(movedFile, (fm) => {
      fm['type'] = SUBPROJECT_TYPE;
    });
  }

  return true;
}

export async function breakOutSubproject(app: App, file: TFile): Promise<boolean> {
  const target = computeBreakoutTarget(file.path);
  if (!target) return false;

  const folder = app.vault.getAbstractFileByPath(target.sourceFolder);
  if (!(folder instanceof TFolder)) return false;

  if (app.vault.getAbstractFileByPath(target.destFolder)) {
    new Notice(`A project named "${target.projectName}" already exists at the top level.`);
    return false;
  }

  await app.vault.rename(folder, target.destFolder);

  const newFilePath = `${target.destFolder}/${file.name}`;
  const movedFile = app.vault.getAbstractFileByPath(newFilePath);
  if (movedFile instanceof TFile) {
    await app.fileManager.processFrontMatter(movedFile, (fm) => {
      fm['type'] = PROJECT_TYPE;
    });
  }

  return true;
}
