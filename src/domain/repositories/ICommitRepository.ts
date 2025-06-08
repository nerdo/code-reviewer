import { Commit } from '../entities/Commit';

export interface ICommitRepository {
  getCommit(repoPath: string, hash: string): Promise<Commit>;
  getCommits(repoPath: string, branch?: string, limit?: number): Promise<Commit[]>;
  getCommitsBetween(repoPath: string, fromHash: string, toHash: string): Promise<Commit[]>;
}