import { FileNode } from '../entities/FileNode';
import { FileChange } from '../entities/FileChange';
import { FileDiff } from '../entities/FileDiff';

export interface IFileRepository {
  getFileTree(repoPath: string, commitHash: string): Promise<FileNode>;
  getFileChanges(repoPath: string, fromHash: string, toHash: string): Promise<FileChange[]>;
  getFileDiff(repoPath: string, fromHash: string, toHash: string, filePath: string): Promise<FileDiff>;
  getFileContent(repoPath: string, commitHash: string, filePath: string): Promise<string>;
}