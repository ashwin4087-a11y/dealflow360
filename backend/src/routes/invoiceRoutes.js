import { Router } from 'express';
import { createInvoiceController } from '../controllers/invoiceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const createInvoiceRouter = (prisma) => {
  const router = Router();
  const controller = createInvoiceController(prisma);

  // Using a generic requireAuth for now since billing likely applies across multiple roles
  router.get('/', requireAuth(), controller.getInvoices);
  router.get('/:id', requireAuth(), controller.getInvoice);
  router.post('/:id/pay', requireAuth(), controller.payInvoice);

  return router;
};
