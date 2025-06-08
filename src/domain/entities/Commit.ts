export interface Commit {
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
  parentHashes: string[];
}