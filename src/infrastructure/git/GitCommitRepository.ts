import simpleGit, { SimpleGit } from 'simple-git';
import { ICommitRepository } from '@/domain/repositories/ICommitRepository';
import { Commit } from '@/domain/entities/Commit';

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

    return this.mapLogToCommit(log.all[0]);
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
    return log.all.map(this.mapLogToCommit);
  }

  async getCommitsBetween(
    repoPath: string,
    fromHash: string,
    toHash: string
  ): Promise<Commit[]> {
    const git = this.getGit(repoPath);
    const log = await git.log([`${fromHash}..${toHash}`]);
    return log.all.map(this.mapLogToCommit);
  }

  private mapLogToCommit(logEntry: Record<string, unknown>): Commit {
    return {
      hash: logEntry.hash as string,
      message: logEntry.message as string,
      author: logEntry.author_name as string,
      authorEmail: logEntry.author_email as string,
      date: new Date(logEntry.date as string),
      parentHashes: logEntry.parent ? (logEntry.parent as string).split(' ') : []
    };
  }
}