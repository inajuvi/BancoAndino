import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createCasoService } from './services/casoService.js';
import { createCasosRouter } from './routes/casos.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Fábrica de la aplicación: recibe configuración y dependencias para poder probarla aislada.
export function createApp({ config, repository, vault, audit }) {
  const app = express();
  const service = createCasoService({ repository, vault, audit });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.get('/health', (_req, res) => res.json({ estado: 'ok' }));

  app.use(
    '/casos',
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'DEMASIADAS_PETICIONES', message: 'Demasiadas peticiones. Espera un momento.', campos: [] } },
    }),
    createCasosRouter({ config, service }),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
