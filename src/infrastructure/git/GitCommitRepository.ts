import simpleGit, { SimpleGit } from 'simple-git';
import { ICommitRepository } from '@/domain/repositories/ICommitRepository';
import { Commit } from '@/domain/entities/Commit';

interface GitLogEntry {
  hash: string;
  message: string;
  author_name: string;
  author_email: string;
  date: string;
  refs?: string;
  body?: string;
}

export class GitCommitRepository implements ICommitRepository {
  private getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath);
  }

  async getCommit(repoPath: string, hash: string): Promise<Commit> {
    const git = this.getGit(repoPath);
    const log = await git.log([hash, '-1']);
    
    if (log.all.length === 0) {
      throw new Error(`Commit ${hash} not found`);
    }

    return this.mapLogToCommit(log.all[0] as GitLogEntry);
  }

  async getCommits(
    repoPath: string,
    branch?: string,
    limit: number = 100
  ): Promise<Commit[]> {
    const git = this.getGit(repoPath);
    const options = [`-${limit}`];
    
    if (branch) {
      options.push(branch);
    }

    const log = await git.log(options);
    return log.all.map(entry => this.mapLogToCommit(entry as GitLogEntry));
  }

  async getCommitsBetween(
    repoPath: string,
    fromHash: string,
    toHash: string
  ): Promise<Commit[]> {
    const git = this.getGit(repoPath);
    const log = await git.log([`${fromHash}..${toHash}`]);
    return log.all.map(entry => this.mapLogToCommit(entry as GitLogEntry));
  }

  private mapLogToCommit(logEntry: GitLogEntry): Commit {
    return {
      hash: logEntry.hash,
      message: logEntry.message,
      author: logEntry.author_name,
      authorEmail: logEntry.author_email,
      date: new Date(logEntry.date),
      parentHashes: [] // For simplicity, we'll omit parent hashes for now
    };
  }
}