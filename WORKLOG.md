# Worklog

## 2026-03-29

### Investigated
- Templater folder templates apply recursively to subfolders — creating a file like `Projects/Active/MyProject/SupportingFile.md` would get the project template applied, which is wrong
- Considered guarding the template with `tp.file.folder(true)` checks vs handling detection in the plugin itself

### Changed
- **`creator.ts`**: Added `ConvertToProjectModal` and `handleFileCreatedInActive()` — plugin watches for `.md` files created directly in `Projects/Active/` (not subfolders) and prompts the user with a name input (pre-filled with file basename), archive collision warnings, and a Skip button. On confirm, deletes the empty file and creates a proper project.
- **`main.ts`**: Registered vault `create` event listener that calls `handleFileCreatedInActive`.
- **`default-template.md`**: Removed conditional Templater block (`tp.file.folder`, `tp.system.prompt`, `tp.file.rename`, `tp.file.move`). Template is now straightforward Templater syntax with no Bases-specific handling.
- **`README.md`**: Replaced Templater folder template setup instructions with description of automatic plugin detection.
- **`creator.test.ts`**: Added `handleFileCreatedInActive` tests (4 tests: subfolder ignored, outside ignored, non-markdown ignored, modal opens for direct file).
- **`__mocks__/obsidian.ts`**: Added `delete` method to mock vault.

### Decisions
- Handle Bases/manual file detection in the plugin rather than via Templater folder templates — folder templates are recursive and can't be scoped to a single directory level
- `ConvertToProjectModal` is a separate modal from `NameInputModal` — it has different UX (explanatory text, Skip button, pre-filled name) specific to the file detection flow

## 2026-03-28

### Changed
- **`creator.ts`**: Added `initializeVault()` — idempotent command that creates `Projects/Active/`, `Projects/Archive/`, and template file. Added `checkVaultInitialized()` guard to `createProject` and `createSubproject` that shows notice if vault isn't set up. Updated error messages to reference "Initialize project vault" command.
- **`main.ts`**: Added `initialize-vault` command registration, imported `initializeVault`.
- **`creator.test.ts`**: Added `initializeVault` test suite (3 tests: creates all, skips existing, creates only missing). Added "vault not initialized" test for `createProject`. Fixed all `getAbstractFileByPath` mock overrides to include `Projects/Active` so `checkVaultInitialized` passes.
- **`README.md`**: Updated Quick Start step 3 to reference Initialize command. Added Initialize to commands table.
- **`default-template.md`**: Extracted template from string literal to standalone .md file for readability. Added conditional Bases support block (`tp.file.folder(true) === "Projects/Active"` triggers name prompt and file move).
- **`nameInputModal.ts`**: Added optional `validate` callback and inline warning display for archive collision detection.
- **`archiver.ts`**: Added destination collision check before `vault.rename()`.
- **`test-helpers.ts`**: New file with `makeTFile`/`makeTFolder` helpers using `as any` casts to avoid LSP warnings from mock constructors.

### Decisions
- `checkVaultInitialized` only checks for `Projects/Active` folder, not the template — template is checked separately in create functions with its own error message. Keeps concerns separated.
- Template extracted to `.md` file imported via esbuild text loader (`{ ".md": "text" }`) rather than inline string — easier to read and edit.

### Open threads
- Community plugin submission (PR to obsidian-releases repo)

## 2026-03-27

### Investigated
- How to integrate Templater as a dependency replacing the built-in `{{var}}` template engine
- Whether `tp.frontmatter` could set values (it reads, not writes — chicken-and-egg problem with template frontmatter)
- Whether `tp.file.move()` in templates would break subproject creation (it would — moves files to wrong location)
- How to support multiple creation paths: plugin commands, QuickAdd, and Bases

### Changed
- **`creator.ts`**: Removed `renderTemplate()`, `readTemplate()`, `nowISOString()`. Replaced with Templater API calls (`create_new_note_from_template`). Subprojects use `processFrontMatter` to override `type` after Templater processes.
- **`DEFAULT_TEMPLATE`**: Rewritten with Templater syntax — `<% tp.file.title %>`, `<% tp.date.now() %>`. Subprojects dataview query now uses `this.file.folder` (dynamic at render time) instead of baked-in `folderPath`.
- **`main.ts`**: Added Templater presence check on layout ready with 10s notice.
- **`settings.ts`**: Updated template path description to reference Templater syntax.
- **`__mocks__/obsidian.ts`**: Added `plugins` property to App mock.
- **`creator.test.ts`**: Replaced `renderTemplate` tests with Templater API mock tests. Added tests for missing Templater, missing template file, `processFrontMatter` override for subprojects.
- **`README.md`**: Added Prerequisites section (Templater + Dataview). Rewrote template customization section with Templater expressions table and multi-path usage notes.
- **`TODO.md`**: Marked Templater support as done.

### Decisions
- **No `tp.file.move()` in default template** — plugin handles folder placement. QuickAdd users configure output folder in QuickAdd. Avoids subproject files being yanked to wrong location.
- **Template defaults to `type: project`** — hardcoded in template YAML. Plugin patches to `subproject` via `processFrontMatter` after Templater runs. Works for all creation paths (plugin, QuickAdd, Bases).
- **Eliminated `folderPath` concept** — replaced with Dataview's `this.file.folder` which is evaluated dynamically at query render time, always correct regardless of creation path.
- **Templater is a hard dependency** — shows notice on load if missing, refuses to create projects without it. No fallback to the old engine.

### Open threads
- Should test the integration end-to-end in the Test Plugin Vault
- The existing `Project Manager Template.md` in the test vault still uses old `{{var}}` syntax — needs updating
