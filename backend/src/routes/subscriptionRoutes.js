import { Router } from 'express';
import { createSubscriptionController } from '../controllers/subscriptionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const createSubscriptionRouter = (prisma) => {
  const router = Router();
  const controller = createSubscriptionController(prisma);

  // Using a generic requireAuth for now since billing likely applies across multiple roles
  router.get('/', requireAuth(), controller.getSubscriptions);
  router.get('/:id', requireAuth(), controller.getSubscription);

  return router;
};
