export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat = { ctime: 0, mtime: 0, size: 0 };

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() ?? '';
    const dot = this.name.lastIndexOf('.');
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : '';
  }
}

export class TFolder {
  path: string;
  name: string;
  children: Array<TFile | TFolder>;

  constructor(path: string, children: Array<TFile | TFolder> = []) {
    this.path = path;
    this.name = path.split('/').pop() ?? '';
    this.children = children;
  }
}

export class Plugin {
  app: App;
  manifest: Record<string, unknown>;

  constructor(app: App, manifest: Record<string, unknown> = {}) {
    this.app = app;
    this.manifest = manifest;
  }

  registerEvent(_event: unknown): void {}
  addSettingTab(_tab: unknown): void {}
  async loadData(): Promise<Record<string, unknown>> { return {}; }
  async saveData(_data: unknown): Promise<void> {}
}

export class PluginSettingTab {
  app: App;
  containerEl: HTMLElement;

  constructor(app: App, _plugin: unknown) {
    this.app = app;
    this.containerEl = { empty: () => {} } as unknown as HTMLElement;
  }
}

export class Setting {
  setName(_name: string): this { return this; }
  setDesc(_desc: string): this { return this; }
  addToggle(_cb: (toggle: { setValue: (v: boolean) => { onChange: (cb: (v: boolean) => void) => void } }) => void): this {
    return this;
  }
  addText(_cb: (text: {
    setPlaceholder: (v: string) => { setValue: (v: string) => { onChange: (cb: (v: string) => void) => void } };
    setValue: (v: string) => { onChange: (cb: (v: string) => void) => void };
    onChange: (cb: (v: string) => void) => void;
  }) => void): this {
    return this;
  }
}

export class Notice {
  constructor(public message: string) {}
}

export class Modal {
  app: App;
  contentEl = {
    empty: () => {},
    childElementCount: 0,
    createEl: (_tag: string, _opts?: unknown) => ({
      onclick: null as unknown,
      remove: () => {},
      addEventListener: (_event: string, _cb: unknown) => {},
      focus: () => {},
      value: '',
      placeholder: '',
      style: {} as Record<string, string>,
    }),
    createDiv: () => ({
      createSpan: (_opts?: unknown) => {},
      createEl: (_tag: string, _opts?: unknown) => ({
        onclick: null as unknown,
        addEventListener: (_event: string, _cb: unknown) => {},
      }),
      remove: () => {},
    }),
  };
  constructor(app: App) { this.app = app; }
  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
  setTitle(_title: string): this { return this; }
}

export class SuggestModal<T> {
  app: App;
  constructor(app: App) { this.app = app; }
  open(): void {}
  close(): void {}
  getSuggestions(_query: string): T[] { return []; }
  renderSuggestion(_item: T, _el: unknown): void {}
  onChooseSuggestion(_item: T, _evt: unknown): void {}
}

export class App {
  plugins = {
    plugins: {} as Record<string, any>,
  };
  vault = {
    getMarkdownFiles: (): TFile[] => [],
    getAbstractFileByPath: (_path: string): TFile | TFolder | null => null,
    createFolder: async (_path: string): Promise<void> => {},
    create: async (_path: string, _content: string): Promise<TFile> => new TFile(_path),
    read: async (_file: TFile): Promise<string> => '',
    rename: async (_file: TFile | TFolder, _newPath: string): Promise<void> => {},
    on: (_event: string, _cb: (...args: unknown[]) => unknown) => ({}),
    adapter: {
      read: async (_path: string): Promise<string> => '',
    },
  };
  metadataCache = {
    getFileCache: (_file: TFile): { frontmatter?: Record<string, unknown> } | null => null,
    on: (_event: string, _cb: (...args: unknown[]) => unknown) => ({}),
  };
  fileManager = {
    processFrontMatter: async (
      _file: TFile,
      _fn: (fm: Record<string, unknown>) => void
    ): Promise<void> => {},
  };
  workspace = {
    onLayoutReady: (_cb: () => void): void => {},
    getActiveFile: (): TFile | null => null,
    openLinkText: async (_linktext: string, _sourcePath: string): Promise<void> => {},
  };
}
