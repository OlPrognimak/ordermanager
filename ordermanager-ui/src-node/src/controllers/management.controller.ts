import { Router } from 'express';

export const managementRouter = (): Router => {
  const router = Router();

  router.get('/management/health', (_req, res) => {
    res.json({ status: 'UP' });
  });

  return router;
};
