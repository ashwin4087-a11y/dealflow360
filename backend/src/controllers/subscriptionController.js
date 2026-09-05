import { createSubscriptionService } from '../services/subscriptionService.js';

export const createSubscriptionController = (prisma) => {
  const service = createSubscriptionService(prisma);

  const getSubscriptions = async (req, res, next) => {
    try {
      const subscriptions = await service.getAllSubscriptions();
      res.json({ success: true, data: subscriptions });
    } catch (err) {
      next(err);
    }
  };

  const getSubscription = async (req, res, next) => {
    try {
      const subscription = await service.getSubscriptionById(req.params.id);
      if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
      res.json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  };

  return {
    getSubscriptions,
    getSubscription,
  };
};
