import { App, Modal } from 'obsidian';

export type NameWarning = string | null;

export class NameInputModal extends Modal {
  private promptTitle: string;
  private onSubmit: (name: string) => void;
  private validate?: (name: string) => NameWarning;

  constructor(
    app: App,
    promptTitle: string,
    onSubmit: (name: string) => void,
    validate?: (name: string) => NameWarning
  ) {
    super(app);
    this.promptTitle = promptTitle;
    this.onSubmit = onSubmit;
    this.validate = validate;
  }

  onOpen(): void {
    this.setTitle(this.promptTitle);
    const { contentEl } = this;
    contentEl.empty();

    const input = contentEl.createEl('input', { type: 'text' }) as HTMLInputElement;
    input.placeholder = 'Enter name…';
    input.style.width = '100%';

    const warningEl = contentEl.createEl('div');
    warningEl.style.color = 'var(--text-warning)';
    warningEl.style.fontSize = '0.85em';
    warningEl.style.marginTop = '4px';
    warningEl.style.display = 'none';

    const updateWarning = () => {
      const name = input.value.trim();
      if (!name || !this.validate) {
        warningEl.style.display = 'none';
        return;
      }
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
      this.onSubmit(name);
    };

    input.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.key === 'Enter') {
        // Prevent the Enter keypress from landing in the editor after the modal
        // closes and focus returns to the active file, which would insert a
        // newline before the frontmatter delimiter and break YAML parsing.
        evt.preventDefault();
        submit();
      }
    });

    const btn = contentEl.createEl('button', { text: 'Create' });
    btn.addEventListener('click', submit);

    // Focus input on next tick so it gets focus after the modal opens
    setTimeout(() => input.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
