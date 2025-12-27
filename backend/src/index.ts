import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool } from './db.js';
import resumeRoutes from './routes/resumes.js';
import sectionRoutes from './routes/sections.js';
import entryRoutes from './routes/entries.js';
import bulletRoutes from './routes/bullets.js';
import urlRoutes from './routes/urls.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API Routes
app.use('/api/resumes', resumeRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/bullets', bulletRoutes);
app.use('/api/urls', urlRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

