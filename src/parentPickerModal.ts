import { App, SuggestModal, TFile } from 'obsidian';
import { isDepth2UnderActive } from './utils';

export class ParentPickerModal extends SuggestModal<TFile> {
  private currentFile: TFile;
  private onChoose: (parent: TFile) => void;

  constructor(app: App, currentFile: TFile, onChoose: (parent: TFile) => void) {
    super(app);
    this.currentFile = currentFile;
    this.onChoose = onChoose;
  }

  getSuggestions(query: string): TFile[] {
    const lower = query.toLowerCase();
    return this.app.vault.getMarkdownFiles().filter((f) => {
      if (f.path === this.currentFile.path) return false;
      if (!isDepth2UnderActive(f.path)) return false;
      return f.basename.toLowerCase().includes(lower);
    });
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createEl('span', { text: file.basename });
  }

  onChooseSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
    this.onChoose(file);
  }
}
