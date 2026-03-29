import { App, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_TEMPLATE_PATH, PluginSettings } from './types';

export const DEFAULT_SETTINGS: PluginSettings = {
  enabled: true,
  templatePath: DEFAULT_TEMPLATE_PATH,
  projectTypes: '',
};

export function parseProjectTypes(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export class ProjectManagerSettingTab extends PluginSettingTab {
  private plugin: { settings: PluginSettings; saveSettings: () => Promise<void> };

  constructor(
    app: App,
    plugin: { settings: PluginSettings; saveSettings: () => Promise<void> } & ConstructorParameters<typeof PluginSettingTab>[1]
  ) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Enable auto-archive')
      .setDesc('Automatically move projects to the archive when their Status is set to "complete" or "stop".')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Project template path')
      .setDesc('Path to the Templater template used when creating new projects and subprojects. Uses Templater syntax for dynamic values. The template defaults to type: project; subprojects are patched automatically.')
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_TEMPLATE_PATH)
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value || DEFAULT_TEMPLATE_PATH;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Project types')
      .setDesc('Comma-separated list of project types (e.g. "trip, research, hobby"). Leave empty to disable the project type dropdown during creation.')
      .addText((text) =>
        text
          .setPlaceholder('trip, research, hobby')
          .setValue(this.plugin.settings.projectTypes)
          .onChange(async (value) => {
            this.plugin.settings.projectTypes = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
