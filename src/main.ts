import { Notice, Plugin } from 'obsidian';
import { PluginSettings, PROJECT_TYPE, SUBPROJECT_TYPE } from './types';
import { DEFAULT_SETTINGS, ProjectManagerSettingTab } from './settings';
import { StatusWatcher } from './statusWatcher';
import { promoteToSubfolder } from './promoter';
import { StandaloneProjectsModal } from './standaloneModal';
import { computePromoteTarget, isDepth2UnderActive, isDepth3UnderActive } from './utils';
import { checkProjectName, createProject, createSubproject, ensureTemplate, getTemplater } from './creator';
import { NameInputModal } from './nameInputModal';
import { ParentPickerModal } from './parentPickerModal';
import { attachAsSubproject, breakOutSubproject } from './subproject';

export default class ProjectManagerPlugin extends Plugin {
  settings!: PluginSettings;
  private watcher!: StatusWatcher;

  async onload() {
    await this.loadSettings();
    this.watcher = new StatusWatcher(this.app, this, this.settings);
    this.watcher.register();
    this.app.workspace.onLayoutReady(() => {
      this.watcher.initSnapshot();
      if (!getTemplater(this.app)) {
        new Notice(
          'Project Manager requires the Templater plugin. Please install and enable it.',
          10000
        );
      }
    });
    this.addSettingTab(new ProjectManagerSettingTab(this.app, this));

    this.addCommand({
      id: 'promote-active-file',
      name: 'Promote active file to subfolder',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !computePromoteTarget(file.path)) return false;
        if (!checking) {
          void promoteToSubfolder(this.app, file).then((promoted) => {
            if (promoted) new Notice(`Promoted: ${file.basename}`);
          });
        }
        return true;
      },
    });

    this.addCommand({
      id: 'find-standalone-projects',
      name: 'Find standalone projects',
      callback: () => new StandaloneProjectsModal(this.app).open(),
    });

    this.addCommand({
      id: 'edit-project-template',
      name: 'Edit project template',
      callback: () =>
        void ensureTemplate(this.app, this.settings.templatePath),
    });

    this.addCommand({
      id: 'new-project',
      name: 'New project',
      callback: () =>
        new NameInputModal(
          this.app,
          'New Project',
          (name) => void createProject(this.app, this.settings, name),
          (name) => checkProjectName(this.app, name)
        ).open(),
    });

    this.addCommand({
      id: 'new-subproject',
      name: 'New subproject',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm?.['type'] !== PROJECT_TYPE || !isDepth2UnderActive(file.path)) return false;
        if (!checking)
          new NameInputModal(this.app, 'New Subproject', (name) =>
            void createSubproject(this.app, this.settings, name, file)
          ).open();
        return true;
      },
    });

    this.addCommand({
      id: 'attach-as-subproject',
      name: 'Attach as subproject of\u2026',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm?.['type'] !== PROJECT_TYPE || !isDepth2UnderActive(file.path)) return false;
        if (!checking)
          new ParentPickerModal(this.app, file, (parent) =>
            void attachAsSubproject(this.app, file, parent).then((ok) => {
              if (ok)
                new Notice(
                  `Attached "${file.basename}" as subproject of "${parent.basename}"`
                );
            })
          ).open();
        return true;
      },
    });

    this.addCommand({
      id: 'break-out-subproject',
      name: 'Break out to top-level project',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm?.['type'] !== SUBPROJECT_TYPE || !isDepth3UnderActive(file.path)) return false;
        if (!checking)
          void breakOutSubproject(this.app, file).then((ok) => {
            if (ok) new Notice(`"${file.basename}" is now a top-level project`);
          });
        return true;
      },
    });
  }

  onunload() {
    // cleanup handled by registerEvent()
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
