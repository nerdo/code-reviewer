import { FileChange } from './FileChange';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  change?: FileChange;
}