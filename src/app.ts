import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import wallpaperRoutes from './routes/wallpaperRoutes';
import eventRoutes from './routes/events/eventRoutes';
import blessingRoutes from './routes/blessings/blessingRoutes';
import mediaRoutes from './routes/media/mediaRoutes';
import eventAccessRoutes from './routes/event-access/eventAccessRoutes';
import paymentRoutes from './routes/payment-setup/paymentRoutes';
import notificationRoutes from './routes/notifications/notificationsRoutes';
import deviceRoutes from './routes/notifications/deviceRoutes';
import { loggerMiddleware } from './middlewares/loggerMiddleware';
import logger from './utils/logger';

const app: Application = express();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost',
  'http://wedgo-dev.infoviz.co',
  'capacitor://localhost'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }
    // In development, allow any origin (supports dynamic hostname for same-site cookies)
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);


// Routes

app.use('/api/auth', authRoutes);


app.use('/api/profile', profileRoutes);
app.use('/api/wallpapers', wallpaperRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blessings', blessingRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api', eventAccessRoutes);
app.use('/api/payment-setup', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/devices', deviceRoutes);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to Wedgo Server',
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
  logger.error(`Middleware Error: ${err.stack}`);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong!',
  });
});

export default app;
