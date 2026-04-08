import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import wallpaperRoutes from './routes/wallpaperRoutes';
import { join } from 'path';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes

app.use('/api/auth', authRoutes);


app.use('/api/profile', profileRoutes);
app.use('/api/wallpapers', wallpaperRoutes);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to Wedgo Server-- Updated Logic',
    status: 'success',
    serverTime: new Date().toISOString(),
    version: '1.0.2'
  });
});

// Heath check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR] Middleware:', err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong!',
  });
});

export default app;
