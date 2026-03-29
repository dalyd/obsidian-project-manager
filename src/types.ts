export type ProjectStatus =
  | 'active'
  | 'paused'
  | 'complete'
  | 'stop'
  | 'planning'
  | 'blocked'
  | 'someday';

export const ARCHIVE_STATUSES: ReadonlySet<string> = new Set(['complete', 'stop', 'closed']);

export const STATUS_FIELD = 'Status';
export const COMPLETION_DATE_FIELD = 'completion date';
export const ACTIVE_ROOT = 'Projects/Active';
export const ARCHIVE_ROOT = 'Projects/Archive';

export const PROJECT_TYPE = 'project';
export const SUBPROJECT_TYPE = 'subproject';
export const DEFAULT_TEMPLATE_PATH = 'Templates/Project Manager Template.md';
export const PROJECT_TYPE_FIELD = 'project type';

export interface PluginSettings {
  enabled: boolean;
  templatePath: string;
  projectTypes: string;
}
