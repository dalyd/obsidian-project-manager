# Contributing to Project Manager

Thank you for your interest in contributing! This document covers the development setup, conventions, and guidelines for this Obsidian plugin.

## Getting started

### Prerequisites

- Node.js (LTS, 18+ recommended)
- npm

### Setup

```bash
npm install
```

### Development (watch mode)

```bash
npm run dev
```

This compiles `src/main.ts` to `main.js` at the project root. To test in Obsidian, copy `main.js` and `manifest.json` to your vault:

```
<Vault>/.obsidian/plugins/project-manager/
```

Then reload Obsidian and enable the plugin in **Settings > Community plugins**.

### Production build

```bash
npm run build
```

Runs TypeScript type checking followed by an optimized esbuild bundle.

### Tests

```bash
npm test          # single run
npm run test:watch  # watch mode
```

Tests use [Vitest](https://vitest.dev/) with mocks for the Obsidian API in `src/__mocks__/obsidian.ts`.

## Project structure

```
src/
  main.ts              # Plugin entry point, lifecycle and command registration
  settings.ts          # Settings tab and defaults
  types.ts             # Shared constants and interfaces
  archiver.ts          # Archive logic and completion date stamping
  creator.ts           # Project/subproject creation and templates
  subproject.ts        # Attach/breakout operations
  promoter.ts          # Promote standalone files to project folders
  standaloneModal.ts   # Modal for finding standalone projects
  nameInputModal.ts    # Text input modal for naming projects
  parentPickerModal.ts # Fuzzy picker for selecting a parent project
  statusWatcher.ts     # Watches frontmatter status changes
  utils.ts             # Path helpers and shared utilities
  __mocks__/obsidian.ts # Obsidian API mocks for testing
```

## Coding conventions

- TypeScript with strict null checks enabled.
- Keep `main.ts` minimal — lifecycle and command registration only. Delegate feature logic to separate modules.
- Split large files. If a file exceeds ~200-300 lines, break it into focused modules.
- Prefer `async/await` over promise chains.
- Bundle everything into `main.js` (no unbundled runtime dependencies).
- Use stable command IDs — do not rename once released.

## Linting

```bash
eslint ./src/
```

## Versioning and releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map the plugin version to the minimum Obsidian app version.
- Create a GitHub release whose tag exactly matches the version in `manifest.json` (no `v` prefix).
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as assets.

You can use `npm version patch`, `npm version minor`, or `npm version major` to automate the version bump after updating `minAppVersion` in `manifest.json`.

## Guidelines

- Default to local/offline operation. No network requests unless essential.
- No telemetry. No remote code execution.
- Read/write only what's necessary inside the vault.
- Register and clean up all listeners using `this.register*` helpers so the plugin unloads cleanly.
- Keep startup light. Defer heavy work until needed.
- Prefer sentence case for UI text. Keep in-app strings short and clear.

## References

- [Obsidian API documentation](https://docs.obsidian.md)
- [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Developer policies](https://docs.obsidian.md/Developer+policies)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
