import { App, Modal, Notice, TFile, TFolder } from 'obsidian';
import { ACTIVE_ROOT, ARCHIVE_ROOT, DEFAULT_TEMPLATE_PATH, PluginSettings } from './types';
import { NameWarning } from './nameInputModal';
import DEFAULT_TEMPLATE from './default-template.md';

export { DEFAULT_TEMPLATE };

export async function initializeVault(app: App, templatePath: string): Promise<void> {
  const created: string[] = [];

  if (!app.vault.getAbstractFileByPath(ACTIVE_ROOT)) {
    // Create Projects/ and Projects/Active/ in one go
    const projectsRoot = ACTIVE_ROOT.split('/')[0];
    if (!app.vault.getAbstractFileByPath(projectsRoot)) {
      await app.vault.createFolder(projectsRoot);
    }
    await app.vault.createFolder(ACTIVE_ROOT);
    created.push(ACTIVE_ROOT);
  }

  if (!app.vault.getAbstractFileByPath(ARCHIVE_ROOT)) {
    await app.vault.createFolder(ARCHIVE_ROOT);
    created.push(ARCHIVE_ROOT);
  }

  const templateExists = app.vault.getAbstractFileByPath(templatePath) instanceof TFile;
  if (!templateExists) {
    const parts = templatePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const folder = parts.slice(0, i).join('/');
      if (!app.vault.getAbstractFileByPath(folder)) {
        await app.vault.createFolder(folder);
      }
    }
    await app.vault.create(templatePath, DEFAULT_TEMPLATE);
    created.push(templatePath);
  }

  if (created.length === 0) {
    new Notice('Project Manager: vault is already set up. Nothing to do.');
  } else {
    new Notice(`Project Manager: created ${created.join(', ')}`);
  }
}

export function checkProjectName(app: App, name: string): NameWarning {
  if (app.vault.getAbstractFileByPath(`${ACTIVE_ROOT}/${name}`)) {
    return `A project named "${name}" already exists in Active.`;
  }
  const archiveFolder = app.vault.getAbstractFileByPath(ARCHIVE_ROOT);
  if (archiveFolder instanceof TFolder) {
    for (const yearFolder of archiveFolder.children) {
      if (yearFolder instanceof TFolder) {
        for (const child of yearFolder.children) {
          if (child instanceof TFolder && child.name.toLowerCase() === name.toLowerCase()) {
            return `A project named "${child.name}" already exists in Archive/${yearFolder.name}. This will conflict on archive.`;
          }
        }
      }
    }
  }
  return null;
}

export function getTemplater(app: App): any | null {
  return (app as any).plugins?.plugins?.['templater-obsidian'] ?? null;
}

function getTemplateFile(app: App, templatePath: string): TFile | null {
  const tf = app.vault.getAbstractFileByPath(templatePath);
  return tf instanceof TFile ? tf : null;
}

export async function ensureTemplate(app: App, templatePath: string): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(templatePath);
  if (existing instanceof TFile) {
    await app.workspace.openLinkText(templatePath, '');
    return;
  }

  // Ensure parent folders exist
  const parts = templatePath.split('/');
  for (let i = 1; i < parts.length; i++) {
    const folder = parts.slice(0, i).join('/');
    if (!app.vault.getAbstractFileByPath(folder)) {
      await app.vault.createFolder(folder);
    }
  }

  await app.vault.create(templatePath, DEFAULT_TEMPLATE);
  await app.workspace.openLinkText(templatePath, '');
}

function checkVaultInitialized(app: App): boolean {
  if (!app.vault.getAbstractFileByPath(ACTIVE_ROOT)) {
    new Notice('Project folders not found. Run "Initialize project vault" first.');
    return false;
  }
  return true;
}

export async function createProject(
  app: App,
  settings: PluginSettings,
  name: string
): Promise<void> {
  if (!checkVaultInitialized(app)) return;

  const folderPath = `${ACTIVE_ROOT}/${name}`;

  if (app.vault.getAbstractFileByPath(folderPath)) {
    new Notice(`A project named "${name}" already exists.`);
    return;
  }

  const templater = getTemplater(app);
  if (!templater) {
    new Notice('Project Manager requires the Templater plugin. Please install and enable it.');
    return;
  }

  const templatePath = settings.templatePath ?? DEFAULT_TEMPLATE_PATH;
  const templateFile = getTemplateFile(app, templatePath);
  if (!templateFile) {
    new Notice(`Template not found at "${templatePath}". Run "Initialize project vault" to set up.`);
    return;
  }

  await app.vault.createFolder(folderPath);

  const folder = app.vault.getAbstractFileByPath(folderPath);
  await templater.templater.create_new_note_from_template(
    templateFile,
    folder,
    name,
    true
  );
}

export async function createSubproject(
  app: App,
  settings: PluginSettings,
  name: string,
  parentFile: TFile
): Promise<void> {
  if (!checkVaultInitialized(app)) return;

  const parentFolderPath = parentFile.path.split('/').slice(0, -1).join('/');
  const folderPath = `${parentFolderPath}/${name}`;

  if (app.vault.getAbstractFileByPath(folderPath)) {
    new Notice(`A subproject named "${name}" already exists.`);
    return;
  }

  const templater = getTemplater(app);
  if (!templater) {
    new Notice('Project Manager requires the Templater plugin. Please install and enable it.');
    return;
  }

  const templatePath = settings.templatePath ?? DEFAULT_TEMPLATE_PATH;
  const templateFile = getTemplateFile(app, templatePath);
  if (!templateFile) {
    new Notice(`Template not found at "${templatePath}". Run "Initialize project vault" to set up.`);
    return;
  }

  await app.vault.createFolder(folderPath);

  const folder = app.vault.getAbstractFileByPath(folderPath);
  const newFile = await templater.templater.create_new_note_from_template(
    templateFile,
    folder,
    name,
    true
  );

  // Override type from "project" to "subproject" after Templater processing
  if (newFile instanceof TFile) {
    await app.fileManager.processFrontMatter(newFile, (fm: Record<string, unknown>) => {
      fm['type'] = 'subproject';
    });
  }
}

/** Returns true if `filePath` is a markdown file directly in Projects/Active (not a subfolder). */
function isDirectlyInActive(filePath: string): boolean {
  if (!filePath.startsWith(ACTIVE_ROOT + '/')) return false;
  const relative = filePath.slice(ACTIVE_ROOT.length + 1);
  return !relative.includes('/') && relative.endsWith('.md');
}

class ConvertToProjectModal extends Modal {
  private defaultName: string;
  private onConfirm: (name: string) => void;
  private validate: (name: string) => NameWarning;

  constructor(
    app: App,
    defaultName: string,
    onConfirm: (name: string) => void,
    validate: (name: string) => NameWarning
  ) {
    super(app);
    this.defaultName = defaultName;
    this.onConfirm = onConfirm;
    this.validate = validate;
  }

  onOpen(): void {
    this.setTitle('Convert to project?');
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('p', {
      text: 'A new file was created in Projects/Active. Enter a name to convert it to a project, or skip to leave it as-is.',
    });

    const input = contentEl.createEl('input', { type: 'text' }) as HTMLInputElement;
    input.placeholder = 'Project name…';
    input.value = this.defaultName;
    input.style.width = '100%';

    const warningEl = contentEl.createEl('div');
    warningEl.style.color = 'var(--text-warning)';
    warningEl.style.fontSize = '0.85em';
    warningEl.style.marginTop = '4px';
    warningEl.style.display = 'none';

    const updateWarning = () => {
      const name = input.value.trim();
      if (!name) { warningEl.style.display = 'none'; return; }
      const warning = this.validate(name);
      if (warning) {
        warningEl.textContent = warning;
        warningEl.style.display = 'block';
      } else {
        warningEl.style.display = 'none';
      }
    };

    input.addEventListener('input', updateWarning);

    const submit = () => {
      const name = input.value.trim();
      if (!name) return;
      this.close();
      this.onConfirm(name);
    };

    input.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        submit();
      }
    });

    const btnContainer = contentEl.createDiv();
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '8px';
    btnContainer.style.marginTop = '8px';
    btnContainer.style.justifyContent = 'flex-end';

    const skipBtn = btnContainer.createEl('button', { text: 'Skip' });
    skipBtn.addEventListener('click', () => this.close());

    const createBtn = btnContainer.createEl('button', { text: 'Create project' });
    createBtn.addEventListener('click', submit);

    setTimeout(() => { input.focus(); input.select(); }, 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/**
 * Handle a file created directly in Projects/Active — prompt the user to
 * convert it to a project. Called from a vault 'create' event listener.
 */
export async function handleFileCreatedInActive(
  app: App,
  settings: PluginSettings,
  file: TFile
): Promise<void> {
  if (!isDirectlyInActive(file.path)) return;

  new ConvertToProjectModal(
    app,
    file.basename,
    (name) => {
      void (async () => {
        await app.vault.delete(file);
        await createProject(app, settings, name);
      })();
    },
    (name) => checkProjectName(app, name)
  ).open();
}
