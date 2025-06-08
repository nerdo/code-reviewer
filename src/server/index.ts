import express from 'express';
import cors from 'cors';
import path from 'path';
import { repositoryRouter } from './routes/repository';
import { commitRouter } from './routes/commit';
import { fileRouter } from './routes/file';

const app = express();
const PORT = process.env.PORT || 3001;
const DIST_PATH = process.env.DIST_PATH;

app.use(cors());
app.use(express.json());

app.use('/api/repository', repositoryRouter);
app.use('/api/commits', commitRouter);
app.use('/api/files', fileRouter);

// Serve static files when running as CLI tool
if (DIST_PATH) {
  app.use(express.static(DIST_PATH));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});