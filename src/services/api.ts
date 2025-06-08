import { Repository } from '@/domain/entities/Repository';
import { Commit } from '@/domain/entities/Commit';
import { FileNode } from '@/domain/entities/FileNode';
import { FileChange } from '@/domain/entities/FileChange';
import { FileDiff } from '@/domain/entities/FileDiff';

const API_BASE_URL = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export const api = {
  repository: {
    getInfo: (path: string) =>
      fetchApi<Repository>('/repository/info', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
    getBranches: (path: string) =>
      fetchApi<string[]>('/repository/branches', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
  },
  commits: {
    list: (path: string, branch?: string, limit?: number) =>
      fetchApi<Commit[]>('/commits/list', {
        method: 'POST',
        body: JSON.stringify({ path, branch, limit }),
      }),
    single: (path: string, hash: string) =>
      fetchApi<Commit>('/commits/single', {
        method: 'POST',
        body: JSON.stringify({ path, hash }),
      }),
    between: (path: string, fromHash: string, toHash: string) =>
      fetchApi<Commit[]>('/commits/between', {
        method: 'POST',
        body: JSON.stringify({ path, fromHash, toHash }),
      }),
  },
  files: {
    tree: (path: string, commitHash: string) =>
      fetchApi<FileNode>('/files/tree', {
        method: 'POST',
        body: JSON.stringify({ path, commitHash }),
      }),
    changes: (path: string, fromHash: string, toHash: string) =>
      fetchApi<FileChange[]>('/files/changes', {
        method: 'POST',
        body: JSON.stringify({ path, fromHash, toHash }),
      }),
    treeWithChanges: (
      path: string,
      commitHash: string,
      fromHash: string,
      toHash: string
    ) =>
      fetchApi<FileNode>('/files/tree-with-changes', {
        method: 'POST',
        body: JSON.stringify({ path, commitHash, fromHash, toHash }),
      }),
    diff: (
      path: string,
      fromHash: string,
      toHash: string,
      filePath: string
    ) =>
      fetchApi<FileDiff>('/files/diff', {
        method: 'POST',
        body: JSON.stringify({ path, fromHash, toHash, filePath }),
      }),
    content: (path: string, commitHash: string, filePath: string) =>
      fetchApi<{ content: string }>('/files/content', {
        method: 'POST',
        body: JSON.stringify({ path, commitHash, filePath }),
      }),
  },
};