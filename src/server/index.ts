import express from 'express';
import cors from 'cors';
import { repositoryRouter } from './routes/repository';
import { commitRouter } from './routes/commit';
import { fileRouter } from './routes/file';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/repository', repositoryRouter);
app.use('/api/commits', commitRouter);
app.use('/api/files', fileRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});