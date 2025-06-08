import { Router } from 'express';
import { GitRepositoryRepository } from '@/infrastructure/git/GitRepositoryRepository';

export const repositoryRouter = Router();
const repoRepository = new GitRepositoryRepository();

repositoryRouter.post('/info', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Repository path is required' });
    }

    const repository = await repoRepository.getRepository(path);
    res.json(repository);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

repositoryRouter.post('/branches', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Repository path is required' });
    }

    const branches = await repoRepository.getBranches(path);
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});