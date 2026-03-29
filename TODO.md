# Future Work

## Default project dashboard and views

Provide a command to generate a project dashboard note with
embedded views for reviewing projects. The dashboard should
include sections for:

- **Active projects** — all projects with `Status: active`,
  shown as a table with name, status, type, and due date
- **Upcoming / not started** — projects with status "upcoming"
  or "not started"
- **Paused projects** — projects with `Status: paused`
- **Completed missing completion date** — projects marked
  complete but missing the `completion date` field, as a data
  quality check to catch projects that were completed before
  the plugin was installed or where stamping failed
- **Not yet archived** — projects marked complete but still
  under `Projects/Active/` rather than `Projects/Archive/`,
  to catch stuck items
- **Completed in the past year** — recently completed projects
  sorted by completion date descending

Views should support both Obsidian Bases (`.base` files with
YAML filter/sort definitions) and Dataview queries, since users
may have either or both installed. Consider generating these
via a command similar to "Edit project template".

Additional views to consider once `project type` is implemented:

- **All trips** — filter by `project type: trip`
- **Projects by type** — grouped by project type
- **Stalled projects** — active projects with no recent
  modifications
- **Project timeline** — sorted by created/completion date

## Deploy convenience script

Add an optional `npm run deploy` script that copies build
artifacts to a local vault path configured via an environment
variable, for developer convenience during testing.
