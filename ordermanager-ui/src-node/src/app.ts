import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { loadEnv } from './config/env';
import { backendUrlRouter } from './controllers/backend-url.controller';
import { managementRouter } from './controllers/management.controller';
import { errorHandler } from './middleware/error-handler';

export const createApp = (): { app: Express; env: ReturnType<typeof loadEnv> } => {
  const env = loadEnv();
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());

  app.use(env.contextPath, backendUrlRouter(env));
  app.use(env.contextPath, managementRouter());

  app.use(env.contextPath, express.static(env.staticDir));
  app.get(`${env.contextPath}/*`, (_req, res) => {
    res.sendFile(path.join(env.staticDir, 'index.html'));
  });

  app.use(errorHandler);
  return { app, env };
};
