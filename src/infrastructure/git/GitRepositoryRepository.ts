import simpleGit, { SimpleGit } from 'simple-git';
import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository';
import { Repository } from '@/domain/entities/Repository';
import path from 'path';

export class GitRepositoryRepository implements IRepositoryRepository {
  private getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath);
  }

  async getRepository(repoPath: string): Promise<Repository> {
    const git = this.getGit(repoPath);
    
    const [branches, currentBranch, tags, remotes] = await Promise.all([
      this.getBranches(repoPath),
      this.getCurrentBranch(repoPath),
      this.getTags(repoPath),
      git.getRemotes()
    ]);

    return {
      path: repoPath,
      name: path.basename(repoPath),
      currentBranch,
      branches,
      tags,
      remotes: remotes.map(r => r.name)
    };
  }

  async getBranches(repoPath: string): Promise<string[]> {
    const git = this.getGit(repoPath);
    const branchSummary = await git.branchLocal();
    return branchSummary.all;
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    const git = this.getGit(repoPath);
    const branchSummary = await git.branchLocal();
    return branchSummary.current;
  }

  async getTags(repoPath: string): Promise<string[]> {
    const git = this.getGit(repoPath);
    const tags = await git.tags();
    return tags.all;
  }
}