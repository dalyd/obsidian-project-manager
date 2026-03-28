import { App, Modal, Notice } from 'obsidian';
import { findStandaloneProjects, promoteToSubfolder } from './promoter';

export class StandaloneProjectsModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    this.setTitle('Standalone Projects');
    const files = findStandaloneProjects(this.app);

    if (files.length === 0) {
      this.contentEl.createEl('p', { text: 'No standalone projects found.' });
      return;
    }

    for (const file of files) {
      const row = this.contentEl.createDiv();
      row.createSpan({ text: file.name });
      const btn = row.createEl('button', { text: 'Promote' });
      btn.onclick = async () => {
        await promoteToSubfolder(this.app, file);
        row.remove();
        new Notice(`Promoted: ${file.basename}`);
        if (this.contentEl.childElementCount === 0) {
          this.contentEl.createEl('p', { text: 'All done!' });
        }
      };
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
