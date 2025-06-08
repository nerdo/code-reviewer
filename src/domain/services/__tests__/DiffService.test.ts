import { describe, it, expect } from 'vitest';
import { DiffService } from '../DiffService';

describe('DiffService', () => {
  it('should generate diff for added lines', () => {
    const diffService = new DiffService();
    const oldContent = 'line1\nline2';
    const newContent = 'line1\nline2\nline3';
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines.length).toBeGreaterThan(0);
    const addedLine = hunks[0].lines.find(l => l.type === 'add' && l.content === 'line3');
    expect(addedLine).toBeDefined();
  });

  it('should generate diff for deleted lines', () => {
    const diffService = new DiffService();
    const oldContent = 'line1\nline2\nline3';
    const newContent = 'line1\nline3';
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks).toHaveLength(1);
    const deleteLine = hunks[0].lines.find(l => l.type === 'delete');
    expect(deleteLine).toBeDefined();
    expect(deleteLine?.content).toBe('line2');
  });

  it('should generate diff for modified lines', () => {
    const diffService = new DiffService();
    const oldContent = 'line1\nline2\nline3';
    const newContent = 'line1\nmodified line2\nline3';
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks).toHaveLength(1);
    const lines = hunks[0].lines;
    expect(lines.find(l => l.type === 'delete' && l.content === 'line2')).toBeDefined();
    expect(lines.find(l => l.type === 'add' && l.content === 'modified line2')).toBeDefined();
  });

  it('should handle empty files', () => {
    const diffService = new DiffService();
    
    const hunks = diffService.generateDiff('', 'new content');
    
    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines[0].type).toBe('add');
    expect(hunks[0].lines[0].content).toBe('new content');
  });

  it('should generate multiple hunks for separated changes', () => {
    const diffService = new DiffService();
    const { oldContent, newContent } = makeTestLargeFileWithSeparatedChanges();
    
    const hunks = diffService.generateDiff(oldContent, newContent);
    
    expect(hunks.length).toBeGreaterThanOrEqual(2);
  });

  it('should generate full file diff with all lines included', () => {
    const diffService = new DiffService();
    const oldContent = 'line1\nline2\nline3\nline4\nline5';
    const newContent = 'line1\nmodified line2\nline3\nline4\nline5\nline6';
    
    const hunks = diffService.generateFullFileDiff(oldContent, newContent);
    
    // Should return exactly one hunk containing the entire file
    expect(hunks).toHaveLength(1);
    
    const hunk = hunks[0];
    expect(hunk.oldStart).toBe(1);
    expect(hunk.newStart).toBe(1);
    expect(hunk.oldLines).toBe(5); // old file has 5 lines
    expect(hunk.newLines).toBe(6); // new file has 6 lines
    
    // Should contain all lines from both files
    const normalLines = hunk.lines.filter(l => l.type === 'normal');
    const deletedLines = hunk.lines.filter(l => l.type === 'delete');
    const addedLines = hunk.lines.filter(l => l.type === 'add');
    
    // Based on how diff.diffLines works, the expected counts are:
    expect(normalLines).toHaveLength(3); // line1, line3, line4
    expect(deletedLines).toHaveLength(2); // original line2, line5 (as part of the last chunk)
    expect(addedLines).toHaveLength(3); // modified line2, line5 (unchanged but in new position), line6
    
    // Verify specific content
    expect(normalLines.find(l => l.content === 'line1')).toBeDefined();
    expect(normalLines.find(l => l.content === 'line3')).toBeDefined();
    expect(normalLines.find(l => l.content === 'line4')).toBeDefined();
    expect(deletedLines.find(l => l.content === 'line2')).toBeDefined();
    expect(addedLines.find(l => l.content === 'modified line2')).toBeDefined();
    expect(addedLines.find(l => l.content === 'line6')).toBeDefined();
    
    // Verify the total number of lines covers the entire file
    expect(hunk.lines.length).toBe(8); // All lines from both files
  });

  function makeTestLargeFileWithSeparatedChanges() {
    const oldContent = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join('\n');
    const newContent = oldContent
      .split('\n')
      .map((line, i) => {
        if (i === 2) return 'modified line3';
        if (i === 15) return 'modified line16';
        return line;
      })
      .join('\n');
    
    return { oldContent, newContent };
  }
});