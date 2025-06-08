import { Router } from 'express';
import { GitFileRepository } from '@/infrastructure/git/GitFileRepository';
import { FileTreeService } from '@/domain/services/FileTreeService';

export const fileRouter = Router();
const fileRepository = new GitFileRepository();
const fileTreeService = new FileTreeService();

fileRouter.post('/tree', async (req, res) => {
  try {
    const { path, commitHash } = req.body;
    if (!path || !commitHash) {
      return res.status(400).json({ error: 'Repository path and commit hash are required' });
    }

    const tree = await fileRepository.getFileTree(path, commitHash);
    const sortedTree = fileTreeService.sortFileTree(tree);
    res.json(sortedTree);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

fileRouter.post('/changes', async (req, res) => {
  try {
    const { path, fromHash, toHash } = req.body;
    if (!path || !fromHash || !toHash) {
      return res.status(400).json({ error: 'Repository path, fromHash, and toHash are required' });
    }

    const changes = await fileRepository.getFileChanges(path, fromHash, toHash);
    res.json(changes);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

fileRouter.post('/tree-with-changes', async (req, res) => {
  try {
    const { path, commitHash, fromHash, toHash } = req.body;
    if (!path || !commitHash || !fromHash || !toHash) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    const [tree, changes] = await Promise.all([
      fileRepository.getFileTree(path, commitHash),
      fileRepository.getFileChanges(path, fromHash, toHash)
    ]);

    const treeWithChanges = fileTreeService.buildFileTreeWithChanges(tree, changes);
    const sortedTree = fileTreeService.sortFileTree(treeWithChanges);
    res.json(sortedTree);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

fileRouter.post('/diff', async (req, res) => {
  try {
    const { path, fromHash, toHash, filePath } = req.body;
    if (!path || !fromHash || !toHash || !filePath) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    const diff = await fileRepository.getFileDiff(path, fromHash, toHash, filePath);
    res.json(diff);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

fileRouter.post('/content', async (req, res) => {
  try {
    const { path, commitHash, filePath } = req.body;
    if (!path || !commitHash || !filePath) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    const content = await fileRepository.getFileContent(path, commitHash, filePath);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});