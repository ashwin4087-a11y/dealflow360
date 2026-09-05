import { createInvoiceService } from '../services/invoiceService.js';

export const createInvoiceController = (prisma) => {
  const service = createInvoiceService(prisma);

  const getInvoices = async (req, res, next) => {
    try {
      const invoices = await service.getAllInvoices();
      res.json({ success: true, data: invoices });
    } catch (err) {
      next(err);
    }
  };

  const getInvoice = async (req, res, next) => {
    try {
      const invoice = await service.getInvoiceById(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  };

  const payInvoice = async (req, res, next) => {
    try {
      const payment = await service.recordPayment(req.params.id, req.body);
      res.json({ success: true, data: payment, message: 'Payment recorded' });
    } catch (err) {
      next(err);
    }
  };

  return {
    getInvoices,
    getInvoice,
    payInvoice,
  };
};
