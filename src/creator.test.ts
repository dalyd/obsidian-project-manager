import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, TFile, TFolder } from 'obsidian';
import { checkProjectName, createProject, createSubproject, ensureTemplate, initializeVault, DEFAULT_TEMPLATE } from './creator';
import { DEFAULT_TEMPLATE_PATH } from './types';
import { makeTFile, makeTFolder } from './test-helpers';

// ---------------------------------------------------------------------------
// Helper: mock Templater plugin
// ---------------------------------------------------------------------------
function mockTemplaterPlugin(app: App, createdFile?: TFile) {
  const mock = {
    templater: {
      create_new_note_from_template: vi.fn().mockResolvedValue(
        createdFile ?? makeTFile('Projects/Active/Test Project/Test Project.md')
      ),
    },
  };
  (app as any).plugins = { plugins: { 'templater-obsidian': mock } };
  return mock;
}

// ---------------------------------------------------------------------------
// initializeVault
// ---------------------------------------------------------------------------
describe('initializeVault', () => {
  let app: App;
  const templatePath = DEFAULT_TEMPLATE_PATH;

  beforeEach(() => {
    app = new App();
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
    vi.spyOn(app.vault, 'createFolder').mockResolvedValue(undefined as unknown as never);
    vi.spyOn(app.vault, 'create').mockImplementation(async (path) => makeTFile(path));
  });

  it('creates Projects/Active, Projects/Archive, and template when nothing exists', async () => {
    await initializeVault(app, templatePath);

    expect(app.vault.createFolder).toHaveBeenCalledWith('Projects');
    expect(app.vault.createFolder).toHaveBeenCalledWith('Projects/Active');
    expect(app.vault.createFolder).toHaveBeenCalledWith('Projects/Archive');
    expect(app.vault.createFolder).toHaveBeenCalledWith('Templates');
    expect(app.vault.create).toHaveBeenCalledWith(templatePath, DEFAULT_TEMPLATE);
  });

  it('skips folders and template that already exist', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === 'Projects/Archive') return makeTFolder('Projects/Archive');
      if (path === templatePath) return makeTFile(templatePath);
      return null;
    });

    await initializeVault(app, templatePath);

    expect(app.vault.createFolder).not.toHaveBeenCalled();
    expect(app.vault.create).not.toHaveBeenCalled();
  });

  it('creates only what is missing', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects') return makeTFolder('Projects');
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === 'Templates') return makeTFolder('Templates');
      return null;
    });

    await initializeVault(app, templatePath);

    expect(app.vault.createFolder).toHaveBeenCalledWith('Projects/Archive');
    expect(app.vault.create).toHaveBeenCalledWith(templatePath, DEFAULT_TEMPLATE);
    expect(app.vault.createFolder).not.toHaveBeenCalledWith('Projects');
    expect(app.vault.createFolder).not.toHaveBeenCalledWith('Projects/Active');
  });
});

// ---------------------------------------------------------------------------
// checkProjectName
// ---------------------------------------------------------------------------
describe('checkProjectName', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
  });

  it('returns null when no conflict exists', () => {
    expect(checkProjectName(app, 'Brand New Project')).toBeNull();
  });

  it('warns when project exists in Active', () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Existing') return makeTFolder('Projects/Active/Existing');
      return null;
    });
    expect(checkProjectName(app, 'Existing')).toContain('already exists in Active');
  });

  it('warns when project exists in Archive (case-insensitive)', () => {
    const yearFolder = makeTFolder('Projects/Archive/2025', [
      makeTFolder('Projects/Archive/2025/Old Project'),
    ]);
    const archiveFolder = makeTFolder('Projects/Archive', [yearFolder]);
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Archive') return archiveFolder;
      return null;
    });
    expect(checkProjectName(app, 'old project')).toContain('already exists in Archive/2025');
  });

  it('does not warn for archive names that differ', () => {
    const yearFolder = makeTFolder('Projects/Archive/2025', [
      makeTFolder('Projects/Archive/2025/Other Project'),
    ]);
    const archiveFolder = makeTFolder('Projects/Archive', [yearFolder]);
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Archive') return archiveFolder;
      return null;
    });
    expect(checkProjectName(app, 'New Project')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------
describe('createProject', () => {
  let app: App;
  const settings = { enabled: true, templatePath: DEFAULT_TEMPLATE_PATH };

  beforeEach(() => {
    app = new App();
    const templateFile = makeTFile(DEFAULT_TEMPLATE_PATH);
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === DEFAULT_TEMPLATE_PATH) return templateFile;
      return null;
    });
    vi.spyOn(app.vault, 'createFolder').mockResolvedValue(undefined as unknown as never);
    mockTemplaterPlugin(app);
  });

  it('creates folder and calls Templater to create note', async () => {
    await createProject(app, settings, 'Test Project');

    expect(app.vault.createFolder).toHaveBeenCalledWith('Projects/Active/Test Project');
    const templater = (app as any).plugins.plugins['templater-obsidian'];
    expect(templater.templater.create_new_note_from_template).toHaveBeenCalledWith(
      expect.any(TFile),
      null, // folder returned by getAbstractFileByPath after createFolder
      'Test Project',
      true
    );
  });

  it('passes the correct folder to Templater', async () => {
    const projectFolder = makeTFolder('Projects/Active/Test Project');
    let folderCreated = false;
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === DEFAULT_TEMPLATE_PATH) return makeTFile(DEFAULT_TEMPLATE_PATH);
      if (path === 'Projects/Active/Test Project') return folderCreated ? projectFolder : null;
      return null;
    });
    vi.spyOn(app.vault, 'createFolder').mockImplementation(async () => {
      folderCreated = true;
      return undefined as unknown as never;
    });

    await createProject(app, settings, 'Test Project');

    const templater = (app as any).plugins.plugins['templater-obsidian'];
    expect(templater.templater.create_new_note_from_template).toHaveBeenCalledWith(
      expect.any(TFile),
      projectFolder,
      'Test Project',
      true
    );
  });

  it('does not create when folder already exists', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === 'Projects/Active/Test Project')
        return makeTFolder('Projects/Active/Test Project');
      return null;
    });

    await createProject(app, settings, 'Test Project');
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });

  it('shows notice when vault is not initialized', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);

    await createProject(app, settings, 'Test Project');
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });

  it('shows notice when Templater is not installed', async () => {
    (app as any).plugins = { plugins: {} };

    await createProject(app, settings, 'Test Project');
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });

  it('shows notice when template file is missing', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      return null;
    });

    await createProject(app, settings, 'Test Project');
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createSubproject
// ---------------------------------------------------------------------------
describe('createSubproject', () => {
  let app: App;
  const settings = { enabled: true, templatePath: DEFAULT_TEMPLATE_PATH };
  const parentFile = makeTFile('Projects/Active/Marathon Training/Marathon Training.md');

  beforeEach(() => {
    app = new App();
    const templateFile = makeTFile(DEFAULT_TEMPLATE_PATH);
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === DEFAULT_TEMPLATE_PATH) return templateFile;
      return null;
    });
    vi.spyOn(app.vault, 'createFolder').mockResolvedValue(undefined as unknown as never);
    vi.spyOn(app.fileManager, 'processFrontMatter').mockResolvedValue(undefined);
  });

  it('creates folder inside parent folder', async () => {
    const createdFile = makeTFile(
      'Projects/Active/Marathon Training/Strength Program/Strength Program.md'
    );
    mockTemplaterPlugin(app, createdFile);

    await createSubproject(app, settings, 'Strength Program', parentFile);
    expect(app.vault.createFolder).toHaveBeenCalledWith(
      'Projects/Active/Marathon Training/Strength Program'
    );
  });

  it('calls Templater to create note in subproject folder', async () => {
    const createdFile = makeTFile(
      'Projects/Active/Marathon Training/Strength Program/Strength Program.md'
    );
    const subFolder = makeTFolder('Projects/Active/Marathon Training/Strength Program');
    let folderCreated = false;
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active') return makeTFolder('Projects/Active');
      if (path === DEFAULT_TEMPLATE_PATH) return makeTFile(DEFAULT_TEMPLATE_PATH);
      if (path === 'Projects/Active/Marathon Training/Strength Program')
        return folderCreated ? subFolder : null;
      return null;
    });
    vi.spyOn(app.vault, 'createFolder').mockImplementation(async () => {
      folderCreated = true;
      return undefined as unknown as never;
    });
    mockTemplaterPlugin(app, createdFile);

    await createSubproject(app, settings, 'Strength Program', parentFile);

    const templater = (app as any).plugins.plugins['templater-obsidian'];
    expect(templater.templater.create_new_note_from_template).toHaveBeenCalledWith(
      expect.any(TFile),
      subFolder,
      'Strength Program',
      true
    );
  });

  it('overrides type to subproject via processFrontMatter', async () => {
    const createdFile = makeTFile(
      'Projects/Active/Marathon Training/Strength Program/Strength Program.md'
    );
    mockTemplaterPlugin(app, createdFile);

    await createSubproject(app, settings, 'Strength Program', parentFile);

    expect(app.fileManager.processFrontMatter).toHaveBeenCalledWith(
      createdFile,
      expect.any(Function)
    );

    // Verify the callback sets type to subproject
    const callback = (app.fileManager.processFrontMatter as any).mock.calls[0][1];
    const fm: Record<string, unknown> = { type: 'project' };
    callback(fm);
    expect(fm.type).toBe('subproject');
  });

  it('does not create when subfolder already exists', async () => {
    mockTemplaterPlugin(app);
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Projects/Active/Marathon Training/Strength Program')
        return makeTFolder('Projects/Active/Marathon Training/Strength Program');
      return null;
    });

    await createSubproject(app, settings, 'Strength Program', parentFile);
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });

  it('shows notice when Templater is not installed', async () => {
    (app as any).plugins = { plugins: {} };

    await createSubproject(app, settings, 'Strength Program', parentFile);
    expect(app.vault.createFolder).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ensureTemplate
// ---------------------------------------------------------------------------
describe('ensureTemplate', () => {
  let app: App;
  const templatePath = 'Templates/Project Manager Template.md';

  beforeEach(() => {
    app = new App();
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
    vi.spyOn(app.vault, 'createFolder').mockResolvedValue(undefined as unknown as never);
    vi.spyOn(app.vault, 'create').mockImplementation(async (path) => makeTFile(path));
    vi.spyOn(app.workspace, 'openLinkText').mockResolvedValue(undefined);
  });

  it('creates template file with DEFAULT_TEMPLATE when it does not exist', async () => {
    await ensureTemplate(app, templatePath);

    expect(app.vault.createFolder).toHaveBeenCalledWith('Templates');
    expect(app.vault.create).toHaveBeenCalledWith(templatePath, DEFAULT_TEMPLATE);
  });

  it('opens the template file after creating it', async () => {
    await ensureTemplate(app, templatePath);
    expect(app.workspace.openLinkText).toHaveBeenCalledWith(templatePath, '');
  });

  it('opens existing template without creating', async () => {
    const existingFile = makeTFile(templatePath);
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === templatePath) return existingFile;
      return null;
    });

    await ensureTemplate(app, templatePath);

    expect(app.vault.create).not.toHaveBeenCalled();
    expect(app.workspace.openLinkText).toHaveBeenCalledWith(templatePath, '');
  });

  it('creates nested parent folders as needed', async () => {
    const nestedPath = 'Templates/Projects/Custom Template.md';
    await ensureTemplate(app, nestedPath);

    expect(app.vault.createFolder).toHaveBeenCalledWith('Templates');
    expect(app.vault.createFolder).toHaveBeenCalledWith('Templates/Projects');
    expect(app.vault.create).toHaveBeenCalledWith(nestedPath, DEFAULT_TEMPLATE);
  });

  it('skips folder creation when parent folders already exist', async () => {
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path) => {
      if (path === 'Templates') return makeTFolder('Templates');
      return null;
    });

    await ensureTemplate(app, templatePath);

    expect(app.vault.createFolder).not.toHaveBeenCalled();
    expect(app.vault.create).toHaveBeenCalledWith(templatePath, DEFAULT_TEMPLATE);
  });
});
