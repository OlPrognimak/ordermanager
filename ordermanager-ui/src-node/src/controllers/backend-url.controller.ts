import { Router } from 'express';
import { AppEnv } from '../config/env';

export const backendUrlRouter = (env: AppEnv): Router => {
  const router = Router();

  router.get('/backendUrl', (_req, res) => {
    res.json({ url: env.backendBaseUrl });
  });

  return router;
};
