import { describe, it, expect, vi } from 'vitest';
import { GitFileRepository } from '../GitFileRepository';
import simpleGit from 'simple-git';

vi.mock('simple-git');

describe('GitFileRepository', () => {
  describe('getFileTree', () => {
    it('should build file tree from git ls-tree output', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.raw.mockResolvedValue('src/index.ts\nsrc/utils.ts\nREADME.md\n');

      const tree = await gitFileRepository.getFileTree('/repo', 'abc123');

      expect(mockGit.raw).toHaveBeenCalledWith(['ls-tree', '-r', '--name-only', 'abc123']);
      expect(tree.type).toBe('directory');
      expect(tree.children).toHaveLength(2); // src directory and README.md
      
      const srcDir = tree.children?.find(c => c.name === 'src');
      expect(srcDir?.type).toBe('directory');
      expect(srcDir?.children).toHaveLength(2);
    });

    it('should handle empty repository', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.raw.mockResolvedValue('');

      const tree = await gitFileRepository.getFileTree('/repo', 'abc123');

      expect(tree.children).toHaveLength(0);
    });
  });

  describe('getFileChanges', () => {
    it('should map diff summary to file changes', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      const diffSummary = makeTestDiffSummary();
      mockGit.diffSummary.mockResolvedValue(diffSummary);

      const changes = await gitFileRepository.getFileChanges('/repo', 'abc123', 'def456');

      expect(changes).toHaveLength(4);
      expect(changes[0].changeType).toBe('modified');
      expect(changes[1].changeType).toBe('added');
      expect(changes[2].changeType).toBe('deleted');
      expect(changes[3].changeType).toBe('renamed');
      expect(changes[3].previousPath).toBe('old.ts');
    });
  });

  describe('getFileDiff', () => {
    it('should get diff with content for text files', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.show.mockImplementation((args: string[]) => {
        if (args[0] === 'abc123:test.ts') return Promise.resolve('old content');
        if (args[0] === 'def456:test.ts') return Promise.resolve('new content');
        return Promise.reject(new Error('File not found'));
      });
      mockGit.raw.mockResolvedValue('1\t1\ttest.ts');

      const diff = await gitFileRepository.getFileDiff('/repo', 'abc123', 'def456', 'test.ts');

      expect(diff.path).toBe('test.ts');
      expect(diff.oldContent).toBe('old content');
      expect(diff.newContent).toBe('new content');
      expect(diff.isBinary).toBe(false);
      expect(diff.hunks).toBeDefined();
    });

    it('should handle binary files', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.show.mockImplementation((args: string[]) => {
        if (args[0] === 'abc123:image.png') return Promise.resolve('binary content old');
        if (args[0] === 'def456:image.png') return Promise.resolve('binary content new');
        return Promise.reject(new Error('File not found'));
      });
      mockGit.raw.mockResolvedValue('-\t-\timage.png');

      const diff = await gitFileRepository.getFileDiff('/repo', 'abc123', 'def456', 'image.png');

      expect(diff.isBinary).toBe(true);
      expect(diff.hunks).toHaveLength(0);
    });

    it('should handle deleted files', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.show.mockImplementation((args: string[]) => {
        if (args[0] === 'abc123:deleted.ts') return Promise.resolve('content');
        return Promise.reject(new Error('File not found'));
      });
      mockGit.raw.mockResolvedValue('10\t0\tdeleted.ts');

      const diff = await gitFileRepository.getFileDiff('/repo', 'abc123', 'def456', 'deleted.ts');

      expect(diff.oldContent).toBe('content');
      expect(diff.newContent).toBe('');
    });

    it('should handle unchanged files', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      const sameContent = 'unchanged content';
      mockGit.show.mockResolvedValue(sameContent);
      mockGit.raw.mockResolvedValue('0\t0\tunchanged.ts');

      const diff = await gitFileRepository.getFileDiff('/repo', 'abc123', 'def456', 'unchanged.ts');

      expect(diff.oldContent).toBe(sameContent);
      expect(diff.newContent).toBe(sameContent);
      expect(diff.hunks).toHaveLength(0);
      expect(diff.isBinary).toBe(false);
    });
  });

  describe('getFileContent', () => {
    it('should get file content at specific commit', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.show.mockResolvedValue('file content');

      const content = await gitFileRepository.getFileContent('/repo', 'abc123', 'test.ts');

      expect(mockGit.show).toHaveBeenCalledWith(['abc123:test.ts']);
      expect(content).toBe('file content');
    });

    it('should throw error for non-existent file', async () => {
      const { gitFileRepository, mockGit } = makeTestGitFileRepository();
      mockGit.show.mockRejectedValue(new Error('pathspec'));

      await expect(
        gitFileRepository.getFileContent('/repo', 'abc123', 'nonexistent.ts')
      ).rejects.toThrow('File nonexistent.ts not found in commit abc123');
    });
  });

  function makeTestGitFileRepository() {
    const mockGit = {
      raw: vi.fn(),
      diffSummary: vi.fn(),
      show: vi.fn()
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (simpleGit as any).mockReturnValue(mockGit);
    const gitFileRepository = new GitFileRepository();
    
    return { gitFileRepository, mockGit };
  }

  function makeTestDiffSummary() {
    return {
      files: [
        { file: 'src/index.ts', insertions: 10, deletions: 5, changes: 15 },
        { file: 'new.ts', insertions: 20, deletions: 0, changes: 20 },
        { file: 'deleted.ts', insertions: 0, deletions: 30, changes: 30 },
        { file: 'old.ts => new.ts', insertions: 5, deletions: 3, changes: 8 }
      ]
    };
  }
});