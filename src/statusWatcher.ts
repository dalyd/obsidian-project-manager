import { App, TFile } from 'obsidian';
import { ACTIVE_ROOT, PluginSettings } from './types';
import { extractStatus, isUnderActiveRoot, normalizeStatus, shouldArchive } from './utils';
import { archiveProject, stampCompletionDate } from './archiver';

export class StatusWatcher {
  private snapshot: Map<string, string | null> = new Map();
  private inProgress: Set<string> = new Set();

  constructor(
    private app: App,
    private plugin: { registerEvent: (event: ReturnType<App['vault']['on']>) => void },
    private settings: PluginSettings
  ) {}

  initSnapshot(): void {
    this.snapshot.clear();
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!isUnderActiveRoot(file.path)) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const raw = extractStatus(cache?.frontmatter ?? null);
      this.snapshot.set(file.path, normalizeStatus(raw));
    }
  }

  register(): void {
    this.plugin.registerEvent(
      this.app.metadataCache.on('changed', (file: TFile) => {
        void this.handleMetadataChange(file);
      })
    );

    this.plugin.registerEvent(
      this.app.vault.on('rename', (file: TFile, oldPath: string) => {
        if (this.snapshot.has(oldPath)) {
          this.snapshot.delete(oldPath);
        }
        if (isUnderActiveRoot(file.path)) {
          const cache = this.app.metadataCache.getFileCache(file);
          const raw = extractStatus(cache?.frontmatter ?? null);
          this.snapshot.set(file.path, normalizeStatus(raw));
        }
      })
    );
  }

  private async handleMetadataChange(file: TFile): Promise<void> {
    if (!this.settings.enabled) return;
    if (!isUnderActiveRoot(file.path)) return;
    if (this.inProgress.has(file.path)) return;

    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter ?? null;

    // Only react to project and subproject index files
    const type = frontmatter?.['type'];
    if (type !== 'project' && type !== 'subproject') return;

    const newStatus = normalizeStatus(extractStatus(frontmatter));
    const oldStatus = this.snapshot.get(file.path) ?? null;

    // Update snapshot immediately before any async work (prevents re-entry)
    this.snapshot.set(file.path, newStatus);

    if (!shouldArchive(newStatus)) return;
    if (newStatus === oldStatus) return;

    this.inProgress.add(file.path);
    try {
      if (type === 'subproject') {
        await stampCompletionDate(this.app, file, frontmatter as Record<string, unknown> | null, newStatus!);
      } else {
        await archiveProject(this.app, file, frontmatter as Record<string, unknown> | null, newStatus!);
      }
    } finally {
      this.inProgress.delete(file.path);
    }
  }

  getSnapshot(): ReadonlyMap<string, string | null> {
    return this.snapshot;
  }
}
