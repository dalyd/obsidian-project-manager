import {
  ACTIVE_ROOT,
  ARCHIVE_ROOT,
  ARCHIVE_STATUSES,
  COMPLETION_DATE_FIELD,
  STATUS_FIELD,
} from './types';

export interface ArchiveTarget {
  sourcePath: string;
  destPath: string;
  isFolder: true;
  projectName: string;
}

export function normalizeStatus(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    raw = raw[0];
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function shouldArchive(status: string | null): boolean {
  if (status === null) return false;
  return ARCHIVE_STATUSES.has(status);
}

export function extractStatus(frontmatter: Record<string, unknown> | null | undefined): unknown {
  if (!frontmatter) return null;
  return frontmatter[STATUS_FIELD] ?? null;
}

export function resolveArchiveYear(
  frontmatter: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): number {
  if (frontmatter) {
    const raw = frontmatter[COMPLETION_DATE_FIELD];
    if (raw !== null && raw !== undefined) {
      const str = String(raw).trim();
      // Accept YYYY-MM-DD or ISO datetime
      const match = str.match(/^(\d{4})-\d{2}-\d{2}/);
      if (match) {
        const year = parseInt(match[1], 10);
        if (!isNaN(year)) return year;
      }
    }
  }
  return now.getFullYear();
}

export function todayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isUnderActiveRoot(filePath: string): boolean {
  return filePath.startsWith(ACTIVE_ROOT + '/');
}

export function activeRelativeParts(filePath: string): string[] | null {
  if (!isUnderActiveRoot(filePath)) return null;
  const relative = filePath.slice(ACTIVE_ROOT.length + 1);
  return relative.split('/');
}

export function isDepth2UnderActive(filePath: string): boolean {
  const parts = activeRelativeParts(filePath);
  return parts !== null && parts.length === 2;
}

export function isDepth3UnderActive(filePath: string): boolean {
  const parts = activeRelativeParts(filePath);
  return parts !== null && parts.length === 3;
}

export interface PromoteTarget {
  folderPath: string;   // e.g. 'Projects/Active/Weight'
  destFilePath: string; // e.g. 'Projects/Active/Weight/Weight.md'
  projectName: string;  // e.g. 'Weight'
}

/**
 * Returns a PromoteTarget if the file is a standalone project directly in Active root.
 * Returns null for files already in a subfolder, files in Archive, or files outside Active.
 */
export function computePromoteTarget(filePath: string): PromoteTarget | null {
  if (!isUnderActiveRoot(filePath)) return null;

  const relative = filePath.slice(ACTIVE_ROOT.length + 1);
  const parts = relative.split('/');

  // Must be exactly "Name.md" (one segment, markdown file)
  if (parts.length !== 1 || !parts[0].endsWith('.md')) return null;

  const fileName = parts[0];
  const projectName = fileName.slice(0, -'.md'.length);
  const folderPath = `${ACTIVE_ROOT}/${projectName}`;
  const destFilePath = `${folderPath}/${fileName}`;

  return { folderPath, destFilePath, projectName };
}

export function computeArchiveTarget(
  filePath: string,
  year: number
): { target: ArchiveTarget; warn: false } | { target: null; warn: true } | { target: null; warn: false } {
  if (!isUnderActiveRoot(filePath)) {
    return { target: null, warn: false };
  }

  // Path relative to "Projects/Active/"
  const relative = filePath.slice(ACTIVE_ROOT.length + 1);
  const parts = relative.split('/');

  if (parts.length === 1) {
    // Standalone .md directly in Active root
    return { target: null, warn: true };
  }

  if (parts.length === 2) {
    const folderName = parts[0];
    // Archive the parent folder regardless of whether the filename matches the folder name.
    // Project index files are identified by type: project in frontmatter (checked by caller).
    const sourcePath = `${ACTIVE_ROOT}/${folderName}`;
    const destPath = `${ARCHIVE_ROOT}/${year}/${folderName}`;
    return {
      target: { sourcePath, destPath, isFolder: true, projectName: folderName },
      warn: false,
    };
  }

  // Deeper nesting — supporting doc inside a project folder
  return { target: null, warn: false };
}
