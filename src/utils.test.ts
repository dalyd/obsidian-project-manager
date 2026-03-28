import { describe, it, expect } from 'vitest';
import {
  normalizeStatus,
  shouldArchive,
  extractStatus,
  resolveArchiveYear,
  todayDateString,
  isUnderActiveRoot,
  computeArchiveTarget,
  computePromoteTarget,
  activeRelativeParts,
  isDepth2UnderActive,
  isDepth3UnderActive,
} from './utils';

// ---------------------------------------------------------------------------
// normalizeStatus
// ---------------------------------------------------------------------------
describe('normalizeStatus', () => {
  it('returns lowercase trimmed string', () => {
    expect(normalizeStatus('Active')).toBe('active');
    expect(normalizeStatus('  Complete  ')).toBe('complete');
    expect(normalizeStatus('STOP')).toBe('stop');
  });

  it('returns first element from array', () => {
    expect(normalizeStatus(['Complete', 'active'])).toBe('complete');
  });

  it('returns null for empty array', () => {
    expect(normalizeStatus([])).toBeNull();
  });

  it('returns null for null / undefined', () => {
    expect(normalizeStatus(null)).toBeNull();
    expect(normalizeStatus(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeStatus('')).toBeNull();
    expect(normalizeStatus('   ')).toBeNull();
  });

  it('handles mixed-case in array', () => {
    expect(normalizeStatus(['Paused'])).toBe('paused');
  });

  it('returns null for non-string non-array', () => {
    expect(normalizeStatus(42)).toBeNull();
    expect(normalizeStatus({})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shouldArchive
// ---------------------------------------------------------------------------
describe('shouldArchive', () => {
  it('returns true for "complete"', () => expect(shouldArchive('complete')).toBe(true));
  it('returns true for "stop"', () => expect(shouldArchive('stop')).toBe(true));
  it('returns true for "closed"', () => expect(shouldArchive('closed')).toBe(true));
  it('returns false for "active"', () => expect(shouldArchive('active')).toBe(false));
  it('returns false for "paused"', () => expect(shouldArchive('paused')).toBe(false));
  it('returns false for null', () => expect(shouldArchive(null)).toBe(false));
});

// ---------------------------------------------------------------------------
// extractStatus
// ---------------------------------------------------------------------------
describe('extractStatus', () => {
  it('returns the Status field when present', () => {
    expect(extractStatus({ Status: 'active' })).toBe('active');
  });

  it('returns null when Status is absent', () => {
    expect(extractStatus({ other: 'value' })).toBeNull();
  });

  it('returns null for null frontmatter', () => {
    expect(extractStatus(null)).toBeNull();
  });

  it('returns null for undefined frontmatter', () => {
    expect(extractStatus(undefined)).toBeNull();
  });

  it('returns array value unchanged', () => {
    expect(extractStatus({ Status: ['complete'] })).toEqual(['complete']);
  });
});

// ---------------------------------------------------------------------------
// resolveArchiveYear
// ---------------------------------------------------------------------------
describe('resolveArchiveYear', () => {
  const fixedNow = new Date('2026-03-15');
  const fixedYear = fixedNow.getFullYear();

  it('uses completion date year when present and valid', () => {
    expect(resolveArchiveYear({ 'completion date': '2025-12-01' }, fixedNow)).toBe(2025);
  });

  it('falls back to now year when no completion date', () => {
    expect(resolveArchiveYear({}, fixedNow)).toBe(fixedYear);
  });

  it('falls back to now year when completion date is invalid', () => {
    expect(resolveArchiveYear({ 'completion date': 'not-a-date' }, fixedNow)).toBe(fixedYear);
  });

  it('handles ISO datetime strings', () => {
    expect(resolveArchiveYear({ 'completion date': '2024-06-15T10:30:00Z' }, fixedNow)).toBe(2024);
  });

  it('falls back to now year for null frontmatter', () => {
    expect(resolveArchiveYear(null, fixedNow)).toBe(fixedYear);
  });
});

// ---------------------------------------------------------------------------
// todayDateString
// ---------------------------------------------------------------------------
describe('todayDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    // Use local-time constructor (year, month-1, day) to avoid UTC parse offset
    expect(todayDateString(new Date(2026, 2, 1))).toBe('2026-03-01');
  });

  it('zero-pads month and day', () => {
    expect(todayDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles double-digit month and day', () => {
    expect(todayDateString(new Date(2025, 10, 23))).toBe('2025-11-23');
  });
});

// ---------------------------------------------------------------------------
// isUnderActiveRoot
// ---------------------------------------------------------------------------
describe('isUnderActiveRoot', () => {
  it('returns true for files inside Active', () => {
    expect(isUnderActiveRoot('Projects/Active/Alpha Project/Alpha Project.md')).toBe(true);
  });

  it('returns false for the Archive', () => {
    expect(isUnderActiveRoot('Projects/Archive/2025/Alpha Project/Alpha Project.md')).toBe(false);
  });

  it('returns false for unrelated paths', () => {
    expect(isUnderActiveRoot('Notes/meeting.md')).toBe(false);
  });

  it('returns false for exact Active root (no trailing slash)', () => {
    expect(isUnderActiveRoot('Projects/Active')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeArchiveTarget
// ---------------------------------------------------------------------------
describe('computeArchiveTarget', () => {
  it('returns correct target for subfolder project (Name/Name.md)', () => {
    const result = computeArchiveTarget('Projects/Active/My Test Project/My Test Project.md', 2026);
    expect(result.warn).toBe(false);
    expect(result.target).not.toBeNull();
    expect(result.target!.sourcePath).toBe('Projects/Active/My Test Project');
    expect(result.target!.destPath).toBe('Projects/Archive/2026/My Test Project');
    expect(result.target!.isFolder).toBe(true);
    expect(result.target!.projectName).toBe('My Test Project');
  });

  it('returns null with warn=true for standalone file directly in Active', () => {
    const result = computeArchiveTarget('Projects/Active/Standalone Task.md', 2026);
    expect(result.target).toBeNull();
    expect(result.warn).toBe(true);
  });

  it('returns null silently for a path not under Active root', () => {
    const result = computeArchiveTarget('Notes/someNote.md', 2026);
    expect(result.target).toBeNull();
    expect(result.warn).toBe(false);
  });

  it('returns a target for any file at depth 2 (type filtering is done by the watcher)', () => {
    // Supporting docs are filtered out by the statusWatcher via type: project check,
    // not by computeArchiveTarget itself.
    const result = computeArchiveTarget('Projects/Active/Alpha Project/Packing List.md', 2026);
    expect(result.target).not.toBeNull();
    expect(result.target!.sourcePath).toBe('Projects/Active/Alpha Project');
  });

  it('returns a target even when filename does not match folder name', () => {
    const result = computeArchiveTarget('Projects/Active/Website Redesign/Build New Website.md', 2026);
    expect(result.target).not.toBeNull();
    expect(result.target!.sourcePath).toBe('Projects/Active/Website Redesign');
    expect(result.target!.destPath).toBe('Projects/Archive/2026/Website Redesign');
    expect(result.warn).toBe(false);
  });

  it('includes the correct year in the destPath', () => {
    const result = computeArchiveTarget('Projects/Active/Beta Project/Beta Project.md', 2025);
    expect(result.target!.destPath).toBe('Projects/Archive/2025/Beta Project');
  });
});

// ---------------------------------------------------------------------------
// computePromoteTarget
// ---------------------------------------------------------------------------
describe('computePromoteTarget', () => {
  it('returns correct target for standalone file directly in Active', () => {
    const result = computePromoteTarget('Projects/Active/Marathon Training.md');
    expect(result).not.toBeNull();
    expect(result!.projectName).toBe('Marathon Training');
    expect(result!.folderPath).toBe('Projects/Active/Marathon Training');
    expect(result!.destFilePath).toBe('Projects/Active/Marathon Training/Marathon Training.md');
  });

  it('handles multi-word project names', () => {
    const result = computePromoteTarget('Projects/Active/Plan Office Renovation.md');
    expect(result).not.toBeNull();
    expect(result!.projectName).toBe('Plan Office Renovation');
    expect(result!.folderPath).toBe('Projects/Active/Plan Office Renovation');
    expect(result!.destFilePath).toBe('Projects/Active/Plan Office Renovation/Plan Office Renovation.md');
  });

  it('returns null for file already in a subfolder', () => {
    expect(computePromoteTarget('Projects/Active/Marathon Training/Marathon Training.md')).toBeNull();
  });

  it('returns null for file in Archive', () => {
    expect(computePromoteTarget('Projects/Archive/2025/Marathon Training/Marathon Training.md')).toBeNull();
  });

  it('returns null for file not under Active', () => {
    expect(computePromoteTarget('Notes/someNote.md')).toBeNull();
  });

  it('returns null for non-markdown files directly in Active', () => {
    expect(computePromoteTarget('Projects/Active/Marathon Training')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// activeRelativeParts
// ---------------------------------------------------------------------------
describe('activeRelativeParts', () => {
  it('returns parts for a depth-2 file', () => {
    expect(activeRelativeParts('Projects/Active/Foo/Foo.md')).toEqual(['Foo', 'Foo.md']);
  });

  it('returns parts for a depth-3 file', () => {
    expect(activeRelativeParts('Projects/Active/Parent/Sub/Sub.md')).toEqual([
      'Parent',
      'Sub',
      'Sub.md',
    ]);
  });

  it('returns null for a file not under Active', () => {
    expect(activeRelativeParts('Notes/foo.md')).toBeNull();
  });

  it('returns null for archive path', () => {
    expect(activeRelativeParts('Projects/Archive/2025/Foo/Foo.md')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isDepth2UnderActive
// ---------------------------------------------------------------------------
describe('isDepth2UnderActive', () => {
  it('returns true for Name/Name.md pattern', () => {
    expect(isDepth2UnderActive('Projects/Active/Marathon Training/Marathon Training.md')).toBe(true);
  });

  it('returns false for depth-3 (subproject)', () => {
    expect(
      isDepth2UnderActive('Projects/Active/Parent/Sub/Sub.md')
    ).toBe(false);
  });

  it('returns false for depth-1 (standalone)', () => {
    expect(isDepth2UnderActive('Projects/Active/Standalone.md')).toBe(false);
  });

  it('returns false for path not under Active', () => {
    expect(isDepth2UnderActive('Notes/foo.md')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDepth3UnderActive
// ---------------------------------------------------------------------------
describe('isDepth3UnderActive', () => {
  it('returns true for Parent/Sub/Sub.md pattern', () => {
    expect(
      isDepth3UnderActive('Projects/Active/Marathon Training/Strength Program/Strength Program.md')
    ).toBe(true);
  });

  it('returns false for depth-2', () => {
    expect(isDepth3UnderActive('Projects/Active/Marathon Training/Marathon Training.md')).toBe(
      false
    );
  });

  it('returns false for depth-1', () => {
    expect(isDepth3UnderActive('Projects/Active/Standalone.md')).toBe(false);
  });

  it('returns false for path not under Active', () => {
    expect(isDepth3UnderActive('Projects/Archive/2025/Parent/Sub/Sub.md')).toBe(false);
  });
});
