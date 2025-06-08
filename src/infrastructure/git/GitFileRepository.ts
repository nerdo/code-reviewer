import simpleGit, { SimpleGit } from 'simple-git';
import { IFileRepository } from '@/domain/repositories/IFileRepository';
import { FileNode } from '@/domain/entities/FileNode';
import { FileChange, FileChangeType } from '@/domain/entities/FileChange';
import { FileDiff } from '@/domain/entities/FileDiff';
import { DiffService } from '@/domain/services/DiffService';

export class GitFileRepository implements IFileRepository {
  private diffService = new DiffService();

  private getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath);
  }

  async getFileTree(repoPath: string, commitHash: string): Promise<FileNode> {
    const git = this.getGit(repoPath);
    const tree = await git.raw(['ls-tree', '-r', '--name-only', commitHash]);
    
    const files = tree.trim().split('\n').filter(f => f);
    return this.buildTreeFromPaths(files);
  }

  async getFileChanges(
    repoPath: string,
    fromHash: string,
    toHash: string
  ): Promise<FileChange[]> {
    const git = this.getGit(repoPath);
    const diffSummary = await git.diffSummary([fromHash, toHash]);
    
    return diffSummary.files.map(file => {
      const fileAny = file as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      let changeType: FileChangeType;
      let previousPath: string | undefined;

      if (file.file.includes('=>')) {
        const [oldPath, newPath] = file.file.split(' => ').map(p => p.trim());
        changeType = oldPath !== newPath ? FileChangeType.Renamed : FileChangeType.Modified;
        previousPath = oldPath;
      } else if (fileAny.insertions > 0 && fileAny.deletions === 0 && fileAny.changes === fileAny.insertions) {
        changeType = FileChangeType.Added;
      } else if (fileAny.deletions > 0 && fileAny.insertions === 0 && fileAny.changes === fileAny.deletions) {
        changeType = FileChangeType.Deleted;
      } else {
        changeType = FileChangeType.Modified;
      }

      return {
        path: file.file.includes('=>') ? file.file.split(' => ')[1].trim() : file.file,
        previousPath,
        changeType,
        additions: fileAny.insertions || 0,
        deletions: fileAny.deletions || 0
      };
    });
  }

  async getFileDiff(
    repoPath: string,
    fromHash: string,
    toHash: string,
    filePath: string
  ): Promise<FileDiff> {
    const [oldContent, newContent] = await Promise.all([
      this.getFileContent(repoPath, fromHash, filePath).catch(() => ''),
      this.getFileContent(repoPath, toHash, filePath).catch(() => '')
    ]);

    // If both contents are the same, it's an unchanged file
    if (oldContent === newContent && oldContent !== '') {
      return {
        path: filePath,
        oldContent,
        newContent,
        hunks: [],
        isBinary: false
      };
    }

    const isBinary = await this.isFileBinary(repoPath, toHash, filePath);
    const hunks = isBinary ? [] : this.diffService.generateFullFileDiff(oldContent, newContent);

    return {
      path: filePath,
      oldContent,
      newContent,
      hunks,
      isBinary
    };
  }

  async getFileContent(
    repoPath: string,
    commitHash: string,
    filePath: string
  ): Promise<string> {
    const git = this.getGit(repoPath);
    try {
      return await git.show([`${commitHash}:${filePath}`]);
    } catch (error) {
      throw new Error(`File ${filePath} not found in commit ${commitHash}`);
    }
  }

  private async isFileBinary(
    repoPath: string,
    commitHash: string,
    filePath: string
  ): Promise<boolean> {
    const git = this.getGit(repoPath);
    try {
      const result = await git.raw(['diff', '--numstat', `${commitHash}~1`, commitHash, '--', filePath]);
      return result.includes('-\t-\t');
    } catch {
      return false;
    }
  }

  private buildTreeFromPaths(paths: string[]): FileNode {
    const root: FileNode = {
      name: '/',
      path: '/',
      type: 'directory',
      children: []
    };

    for (const filePath of paths) {
      const parts = filePath.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const nodePath = parts.slice(0, i + 1).join('/');

        let child = current.children?.find(c => c.name === part);
        
        if (!child) {
          child = {
            name: part,
            path: nodePath,
            type: isFile ? 'file' : 'directory',
            children: isFile ? undefined : []
          };
          
          if (!current.children) {
            current.children = [];
          }
          current.children.push(child);
        }

        if (!isFile) {
          current = child;
        }
      }
    }

    return root;
  }
}