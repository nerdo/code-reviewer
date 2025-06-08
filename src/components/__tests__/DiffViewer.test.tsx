import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiffViewer } from '../DiffViewer';
import { FileDiff } from '@/domain/entities/FileDiff';

describe('DiffViewer', () => {
  it('should show binary file message for binary files', () => {
    const binaryDiff = makeTestDiff({ isBinary: true });
    
    render(<DiffViewer diff={binaryDiff} viewMode="inline" />);
    
    expect(screen.getByText('Binary file not shown')).toBeInTheDocument();
  });

  it('should render inline diff view', () => {
    const diff = makeTestDiff();
    
    render(<DiffViewer diff={diff} viewMode="inline" />);
    
    expect(screen.getByText('line1')).toBeInTheDocument();
    expect(screen.getByText('line2')).toBeInTheDocument();
    expect(screen.getByText('modified line2')).toBeInTheDocument();
    expect(screen.getByText('line3')).toBeInTheDocument();
    expect(screen.getByText('line4')).toBeInTheDocument();
    
    expect(screen.getByText(/@@ -2,1 \+2,2 @@/)).toBeInTheDocument();
    
    // Check that line numbers are displayed
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.getAllByText('2')).toHaveLength(2); // Line 2 appears twice (delete and add)
  });

  it('should apply correct styling for added lines in inline view', () => {
    const diff = makeTestDiff();
    
    render(<DiffViewer diff={diff} viewMode="inline" />);
    
    const addedLine = screen.getByText('line4').parentElement;
    expect(addedLine).toHaveClass('bg-green-500/20');
  });

  it('should apply correct styling for deleted lines in inline view', () => {
    const diff = makeTestDiff();
    
    render(<DiffViewer diff={diff} viewMode="inline" />);
    
    const deletedLine = screen.getByText('line2').parentElement;
    expect(deletedLine).toHaveClass('bg-red-500/20');
  });

  it('should render side-by-side diff view', () => {
    const diff = makeTestDiff();
    
    render(<DiffViewer diff={diff} viewMode="side-by-side" />);
    
    expect(screen.getAllByText('test.ts')).toHaveLength(2);
    expect(screen.getAllByText('line1')).toHaveLength(2);
    expect(screen.getByText('line2')).toBeInTheDocument();
    expect(screen.getByText('modified line2')).toBeInTheDocument();
    expect(screen.getAllByText('line3')).toHaveLength(2);
    expect(screen.getByText('line4')).toBeInTheDocument();
  });

  it('should handle renamed files in side-by-side view', () => {
    const diff = makeTestRenamedFileDiff();
    
    render(<DiffViewer diff={diff} viewMode="side-by-side" />);
    
    expect(screen.getByText('old-test.ts')).toBeInTheDocument();
    expect(screen.getByText('new-test.ts')).toBeInTheDocument();
  });

  it('should show unchanged file view for files with no changes', () => {
    const unchangedDiff = makeTestUnchangedFileDiff();
    
    render(<DiffViewer diff={unchangedDiff} viewMode="side-by-side" />);
    
    expect(screen.getByText('No changes between commits')).toBeInTheDocument();
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByText('const y = 2;')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Line number
    expect(screen.getByText('2')).toBeInTheDocument(); // Line number
  });

  function makeTestDiff(overrides: Partial<{ isBinary: boolean }> = {}): FileDiff {
    const { isBinary = false } = overrides;
    
    return {
      path: 'test.ts',
      oldContent: 'line1\nline2\nline3',
      newContent: 'line1\nmodified line2\nline3\nline4',
      isBinary,
      hunks: isBinary ? [] : [
        {
          oldStart: 2,
          oldLines: 1,
          newStart: 2,
          newLines: 2,
          lines: [
            { type: 'normal', content: 'line1', oldLineNumber: 1, newLineNumber: 1 },
            { type: 'delete', content: 'line2', oldLineNumber: 2 },
            { type: 'add', content: 'modified line2', newLineNumber: 2 },
            { type: 'normal', content: 'line3', oldLineNumber: 3, newLineNumber: 3 },
            { type: 'add', content: 'line4', newLineNumber: 4 }
          ]
        }
      ]
    };
  }

  function makeTestRenamedFileDiff(): FileDiff {
    return {
      ...makeTestDiff(),
      path: 'new-test.ts',
      previousPath: 'old-test.ts'
    };
  }

  function makeTestUnchangedFileDiff(): FileDiff {
    return {
      path: 'unchanged.ts',
      oldContent: 'const x = 1;\nconst y = 2;',
      newContent: 'const x = 1;\nconst y = 2;',
      hunks: [],
      isBinary: false
    };
  }
});