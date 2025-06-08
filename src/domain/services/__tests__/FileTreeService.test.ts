import { FileTreeService } from '../FileTreeService';
import { FileNode } from '../../entities/FileNode';
import { FileChange, FileChangeType } from '../../entities/FileChange';

describe('FileTreeService', () => {
  let fileTreeService: FileTreeService;

  beforeEach(() => {
    fileTreeService = new FileTreeService();
  });

  it('should build file tree with changes', () => {
    const baseTree: FileNode = {
      name: '/',
      path: '/',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: 'src',
          type: 'directory',
          children: [
            { name: 'index.ts', path: 'src/index.ts', type: 'file' },
            { name: 'utils.ts', path: 'src/utils.ts', type: 'file' }
          ]
        },
        { name: 'README.md', path: 'README.md', type: 'file' }
      ]
    };

    const changes: FileChange[] = [
      {
        path: 'src/index.ts',
        changeType: FileChangeType.Modified,
        additions: 10,
        deletions: 5
      },
      {
        path: 'src/new.ts',
        changeType: FileChangeType.Added,
        additions: 20,
        deletions: 0
      }
    ];

    const result = fileTreeService.buildFileTreeWithChanges(baseTree, changes);

    expect(result.children![0].children![0].change).toBeDefined();
    expect(result.children![0].children![0].change?.changeType).toBe(FileChangeType.Modified);
  });

  it('should sort file tree with directories first', () => {
    const unsortedTree: FileNode = {
      name: '/',
      path: '/',
      type: 'directory',
      children: [
        { name: 'b-file.txt', path: 'b-file.txt', type: 'file' },
        { name: 'a-dir', path: 'a-dir', type: 'directory', children: [] },
        { name: 'a-file.txt', path: 'a-file.txt', type: 'file' },
        { name: 'c-dir', path: 'c-dir', type: 'directory', children: [] }
      ]
    };

    const sorted = fileTreeService.sortFileTree(unsortedTree);

    expect(sorted.children![0].name).toBe('a-dir');
    expect(sorted.children![1].name).toBe('c-dir');
    expect(sorted.children![2].name).toBe('a-file.txt');
    expect(sorted.children![3].name).toBe('b-file.txt');
  });

  it('should recursively sort nested directories', () => {
    const nestedTree: FileNode = {
      name: '/',
      path: '/',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: 'src',
          type: 'directory',
          children: [
            { name: 'z.ts', path: 'src/z.ts', type: 'file' },
            { name: 'components', path: 'src/components', type: 'directory', children: [] },
            { name: 'a.ts', path: 'src/a.ts', type: 'file' }
          ]
        }
      ]
    };

    const sorted = fileTreeService.sortFileTree(nestedTree);

    expect(sorted.children![0].children![0].name).toBe('components');
    expect(sorted.children![0].children![1].name).toBe('a.ts');
    expect(sorted.children![0].children![2].name).toBe('z.ts');
  });
});