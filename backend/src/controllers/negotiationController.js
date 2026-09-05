import {
  approveCounteroffer,
  closeNegotiation,
  createCounteroffer,
  createNegotiation,
  getNegotiation,
  getNegotiationByQuotation,
  listNegotiations,
  rejectCounteroffer,
  submitCounteroffer,
} from "../services/negotiationService.js";

export const createNegotiationController = (prismaClient) => ({
  list: async (req, res, next) => {
    try { res.json({ success: true, data: await listNegotiations(prismaClient, req.user) }); } catch (error) { next(error); }
  },
  get: async (req, res, next) => {
    try { res.json({ success: true, data: await getNegotiation(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
  byQuotation: async (req, res, next) => {
    try { res.json({ success: true, data: await getNegotiationByQuotation(prismaClient, req.user, req.params.quotationId) }); } catch (error) { next(error); }
  },
  create: async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await createNegotiation(prismaClient, req.user, req.params.quotationId) }); } catch (error) { next(error); }
  },
  counteroffer: async (req, res, next) => {
    try { res.json({ success: true, data: await createCounteroffer(prismaClient, req.user, req.params.id, req.body) }); } catch (error) { next(error); }
  },
  submit: async (req, res, next) => {
    try { res.json({ success: true, data: await submitCounteroffer(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
  approve: async (req, res, next) => {
    try { res.json({ success: true, data: await approveCounteroffer(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
  reject: async (req, res, next) => {
    try { res.json({ success: true, data: await rejectCounteroffer(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
  close: async (req, res, next) => {
    try { res.json({ success: true, data: await closeNegotiation(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
});