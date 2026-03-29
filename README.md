# Project Manager for Obsidian

An [Obsidian](https://obsidian.md) plugin that manages projects using a
folder-based convention. Projects live under `Projects/`, with active
projects in `Projects/Active/` and completed ones automatically archived
to `Projects/Archive/` when their status changes.

## Features

- **Automatic archiving** — When a project's `Status` frontmatter changes
  to `complete` or `stop`, the project folder is moved to
  `Projects/Archive/<year>/` with a completion date stamped in frontmatter.
- **Project creation** — Create new projects from a customizable template
  with a single command.
- **Subproject support** — Nest projects inside parent projects. Subprojects
  get completion date stamping but are not individually archived.
- **Attach and break out** — Reorganize projects by attaching a top-level
  project as a subproject, or breaking a subproject out to the top level.
- **Promote to subfolder** — Convert standalone markdown files under
  `Projects/Active/` into proper project folders.
- **Find standalone projects** — Quickly find files under `Projects/Active/`
  that aren't in their own project folder.
- **Templater-powered templates** — Uses the
  [Templater](https://github.com/SilentVoid13/Templater) plugin to process
  project templates, giving you full access to Templater's dynamic dates,
  prompts, and scripting. Templates also work standalone via QuickAdd or Bases.

## Quick start

1. Install and enable the
   [Templater](https://github.com/SilentVoid13/Templater) community plugin
   (required dependency).
   [Dataview](https://github.com/blackfishZYC/obsidian-dataview) is also
   recommended — the default template includes Dataview queries for inbox,
   subprojects, and logs.
2. Install and enable Project Manager
3. Run **Project Manager: Initialize project vault** — this creates the
   `Projects/Active/` and `Projects/Archive/` folders and the default
   template file
4. Run **Project Manager: New project** to create your first project

That's it for basic use. If you also want to create projects from
**Obsidian Bases** or by manually creating files, see
[Using with Bases or manual file creation](#using-with-bases-or-manual-file-creation)
for additional Templater configuration.

## Folder structure

The plugin expects this layout in your vault:

```
Projects/
  Active/
    My Project/
      My Project.md          # Project index file (type: project)
      Sub Task/
        Sub Task.md          # Subproject index file (type: subproject)
  Archive/
    2025/
      Completed Project/
        Completed Project.md
```

## Commands

| Command | Description |
|---------|-------------|
| **Initialize project vault** | Create project folders and template file |
| **New project** | Create a new project folder and index file |
| **New subproject** | Create a subproject under the current project |
| **Attach as subproject of...** | Move a top-level project into another as a subproject |
| **Break out to top-level project** | Move a subproject back to the top level |
| **Edit project template** | Open or create the project template for editing |
| **Promote active file to subfolder** | Convert a standalone file into a project folder |
| **Find standalone projects** | List files not in their own folder |

## Frontmatter

Project index files use these frontmatter fields:

```yaml
---
type: project          # or "subproject"
Status: active         # "complete" or "stop" triggers archiving
completion date: ...   # stamped automatically when status becomes "complete"
created date: ...      # set by the template on creation
---
```

## Template customization

The plugin uses a [Templater](https://github.com/SilentVoid13/Templater)
template when creating new projects and subprojects. You can customize it
via **Settings > Project Manager > Project template path**, or run the
**Edit project template** command to create and open the template file.

The default template uses Templater syntax for dynamic values. The template
should include `type: project` in frontmatter — when creating subprojects,
the plugin automatically overrides the type to `subproject` after Templater
processes the template.

The template works with multiple creation paths:

- **Plugin commands** — The plugin creates the folder and invokes Templater
- **QuickAdd** — Configure QuickAdd's output folder; Templater processes on creation
- **Bases / manual creation** — See [Using with Bases or manual file creation](#using-with-bases-or-manual-file-creation) below

Common Templater expressions in the default template:

| Expression | Description |
|-----------|-------------|
| `<% tp.file.title %>` | The note/project name |
| `<% tp.date.now("YYYY-MM-DDTHH:mm") %>` | Current date and time |

### Using with Bases or manual file creation

When a new file is created directly in `Projects/Active/` (e.g. from an
Obsidian Bases view or by manually creating a file), the plugin detects it
and asks whether to convert it into a project. If you confirm, the plugin
deletes the empty file and creates a proper project folder with the
template applied.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enabled | `true` | Enable automatic archiving on status changes |
| Project template path | `Templates/Project Manager Template.md` | Template file path |

## Installation

### From community plugins

1. Open **Settings > Community plugins**
2. Search for "Project Manager"
3. Select **Install**, then **Enable**

### Manual installation

1. Download `main.js` and `manifest.json` from the
   [latest release](https://github.com/dalyd/obsidian-project-manager/releases)
2. Create a folder at
   `<your-vault>/.obsidian/plugins/project-manager/`
3. Copy `main.js` and `manifest.json` into that folder
4. Reload Obsidian and enable the plugin in
   **Settings > Community plugins**

## Development

```bash
npm install
npm run dev       # watch mode
npm run build     # production build
npm test          # run tests
```

## Acknowledgments

Built on the
[Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
template.

Development assisted by
[Claude Code](https://claude.ai/claude-code).

## License

[MIT](LICENSE)
