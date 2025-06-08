export enum FileChangeType {
  Added = 'added',
  Modified = 'modified',
  Deleted = 'deleted',
  Renamed = 'renamed',
  Moved = 'moved',
}

export interface FileChange {
  path: string;
  previousPath?: string;
  changeType: FileChangeType;
  additions: number;
  deletions: number;
}