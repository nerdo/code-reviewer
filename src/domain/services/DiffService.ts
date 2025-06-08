import { DiffHunk } from '../entities/FileDiff';
import * as diff from 'diff';

export class DiffService {
  generateDiff(oldContent: string, newContent: string): DiffHunk[] {
    const changes = diff.createPatch('file', oldContent, newContent);
    return this.parsePatch(changes);
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