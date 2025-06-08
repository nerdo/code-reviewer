import { Router } from 'express';
import { GitCommitRepository } from '@/infrastructure/git/GitCommitRepository';

export const commitRouter = Router();
const commitRepository = new GitCommitRepository();

commitRouter.post('/list', async (req, res) => {
  try {
    const { path, branch, limit } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Repository path is required' });
    }

    const commits = await commitRepository.getCommits(path, branch, limit);
    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

commitRouter.post('/single', async (req, res) => {
  try {
    const { path, hash } = req.body;
    if (!path || !hash) {
      return res.status(400).json({ error: 'Repository path and commit hash are required' });
    }

    const commit = await commitRepository.getCommit(path, hash);
    res.json(commit);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

commitRouter.post('/between', async (req, res) => {
  try {
    const { path, fromHash, toHash } = req.body;
    if (!path || !fromHash || !toHash) {
      return res.status(400).json({ error: 'Repository path, fromHash, and toHash are required' });
    }

    const commits = await commitRepository.getCommitsBetween(path, fromHash, toHash);
    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});