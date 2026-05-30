import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const store: Record<string, string> = {
  webhookUrl: '',
  webhookSecret: '',
  autoApproveLimit: '5000',
  autoApproveEnabled: 'true',
  promptpayId: '0000000000000',
};

settingsRouter.get('/', (_req, res) => res.json(store));
settingsRouter.patch('/', (req, res) => {
  Object.assign(store, req.body);
  res.json(store);
});
