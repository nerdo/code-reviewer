export interface Repository {
  path: string;
  name: string;
  currentBranch: string;
  branches: string[];
  tags: string[];
  remotes: string[];
}