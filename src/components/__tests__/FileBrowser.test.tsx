import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileBrowser } from '../FileBrowser';
import { FileNode } from '@/domain/entities/FileNode';
import { FileChangeType } from '@/domain/entities/FileChange';

describe('FileBrowser', () => {
  it('should render file tree', () => {
    const mockOnFileSelect = vi.fn();
    const fileTree = makeTestFileTree();

    render(
      <FileBrowser
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('should expand and collapse directories', () => {
    const mockOnFileSelect = vi.fn();
    const fileTree = makeTestFileTree();

    render(
      <FileBrowser
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
      />
    );

    const srcDir = screen.getByText('src');
    
    // The src directory should be auto-expanded because it contains changes
    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('new.ts')).toBeInTheDocument();
    
    // Clicking should collapse it
    fireEvent.click(srcDir);
    
    expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
    expect(screen.queryByText('new.ts')).not.toBeInTheDocument();
    
    // Clicking again should expand it
    fireEvent.click(srcDir);
    
    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('new.ts')).toBeInTheDocument();
  });

  it('should call onFileSelect when clicking a file', () => {
    const mockOnFileSelect = vi.fn();
    const fileTree = makeTestFileTree();

    render(
      <FileBrowser
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
      />
    );

    const readmeFile = screen.getByText('README.md');
    fireEvent.click(readmeFile);

    expect(mockOnFileSelect).toHaveBeenCalledWith('README.md');
  });

  it('should highlight selected file', () => {
    const mockOnFileSelect = vi.fn();
    const fileTree = makeTestFileTree();

    const { rerender } = render(
      <FileBrowser
        fileTree={fileTree}
        selectedFile="README.md"
        onFileSelect={mockOnFileSelect}
      />
    );

    const readmeElement = screen.getByText('README.md').parentElement;
    expect(readmeElement).toHaveClass('bg-accent');

    rerender(
      <FileBrowser
        fileTree={fileTree}
        selectedFile="src/index.ts"
        onFileSelect={mockOnFileSelect}
      />
    );

    // The src directory should already be expanded because it contains changes,
    // so index.ts should be visible without needing to click
    const indexElement = screen.getByText('index.ts').parentElement;
    expect(indexElement).toHaveClass('bg-accent');
  });

  it('should show change indicators for modified files', () => {
    const mockOnFileSelect = vi.fn();
    const fileTree = makeTestFileTree();

    render(
      <FileBrowser
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
      />
    );

    // The src directory should already be expanded because it contains changes,
    // so the files with changes should be visible
    const modifiedFile = screen.getByText('index.ts').parentElement;
    expect(modifiedFile?.querySelector('.text-yellow-500')).toBeInTheDocument();

    const addedFile = screen.getByText('new.ts').parentElement;
    expect(addedFile?.querySelector('.text-green-500')).toBeInTheDocument();
  });

  function makeTestFileTree(): FileNode {
    return {
      name: '/',
      path: '/',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: 'src',
          type: 'directory',
          children: [
            {
              name: 'index.ts',
              path: 'src/index.ts',
              type: 'file',
              change: {
                path: 'src/index.ts',
                changeType: FileChangeType.Modified,
                additions: 10,
                deletions: 5
              }
            },
            {
              name: 'new.ts',
              path: 'src/new.ts',
              type: 'file',
              change: {
                path: 'src/new.ts',
                changeType: FileChangeType.Added,
                additions: 20,
                deletions: 0
              }
            }
          ]
        },
        {
          name: 'README.md',
          path: 'README.md',
          type: 'file'
        }
      ]
    };
  }
});