import { DiffHunk } from '../entities/FileDiff';
import * as diff from 'diff';

export class DiffService {
  generateDiff(oldContent: string, newContent: string): DiffHunk[] {
    const changes = diff.createPatch('file', oldContent, newContent);
    return this.parsePatch(changes);
  }

  generateFullFileDiff(oldContent: string, newContent: string): DiffHunk[] {
    // Use line-by-line diff to get all changes
    const changes = diff.diffLines(oldContent, newContent);
    
    const hunk: DiffHunk = {
      oldStart: 1,
      oldLines: oldContent.split('\n').length,
      newStart: 1,
      newLines: newContent.split('\n').length,
      lines: []
    };

    let oldLineNumber = 1;
    let newLineNumber = 1;

    for (const change of changes) {
      const lines = change.value.split('\n');
      // Remove empty last line if it exists (artifact of splitting)
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      for (const line of lines) {
        if (change.added) {
          hunk.lines.push({
            type: 'add',
            content: line,
            newLineNumber: newLineNumber++
          });
        } else if (change.removed) {
          hunk.lines.push({
            type: 'delete',
            content: line,
            oldLineNumber: oldLineNumber++
          });
        } else {
          hunk.lines.push({
            type: 'normal',
            content: line,
            oldLineNumber: oldLineNumber++,
            newLineNumber: newLineNumber++
          });
        }
      }
    }

    return [hunk];
  }

  private parsePatch(patch: string): DiffHunk[] {
    const lines = patch.split('\n');
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (hunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        
        oldLineNumber = parseInt(hunkMatch[1]);
        newLineNumber = parseInt(hunkMatch[3]);
        
        currentHunk = {
          oldStart: oldLineNumber,
          oldLines: parseInt(hunkMatch[2] || '1'),
          newStart: newLineNumber,
          newLines: parseInt(hunkMatch[4] || '1'),
          lines: []
        };
        continue;
      }

      if (currentHunk && line.length > 0 && i > 3) {
        const firstChar = line[0];
        const content = line.substring(1);

        if (firstChar === '+') {
          currentHunk.lines.push({
            type: 'add',
            content,
            newLineNumber: newLineNumber++
          });
        } else if (firstChar === '-') {
          currentHunk.lines.push({
            type: 'delete',
            content,
            oldLineNumber: oldLineNumber++
          });
        } else if (firstChar === ' ') {
          currentHunk.lines.push({
            type: 'normal',
            content,
            oldLineNumber: oldLineNumber++,
            newLineNumber: newLineNumber++
          });
        }
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }
}