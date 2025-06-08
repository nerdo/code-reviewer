export interface Repository {
  path: string;
  name: string;
  currentBranch: string;
  branches: string[];
  remotes: string[];
}