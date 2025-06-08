import { Repository } from '../entities/Repository';

export interface IRepositoryRepository {
  getRepository(path: string): Promise<Repository>;
  getBranches(path: string): Promise<string[]>;
  getCurrentBranch(path: string): Promise<string>;
}