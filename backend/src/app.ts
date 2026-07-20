import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { locationsRouter } from './routes/locations';
import { bookingsRouter } from './routes/bookings';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());

  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  app.use(cors({ origin: FRONTEND_ORIGIN, credentials: false }));

  app.use(express.json({ limit: '50kb' })); 
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Слишком много запросов, попробуйте позже' },
    })
  );

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Слишком много попыток входа, попробуйте позже' },
    })
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'spotbook-backend' }));

  app.use('/api/auth', authRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/bookings', bookingsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  });

  return app;
}
