import { listCustomerRecommendations, listQuotationRecommendations } from "../services/recommendationService.js";
import { getDealHealth, listDealHealth } from "../services/dealHealthService.js";
import { getDealRescue, listDealRescue } from "../services/dealRescueService.js";

export const createIntelligenceController = (prismaClient) => ({
  customerRecommendations: async (req, res, next) => {
    try { res.json({ success: true, data: await listCustomerRecommendations(prismaClient, req.user, req.params.customerId) }); } catch (error) { next(error); }
  },
  quotationRecommendations: async (req, res, next) => {
    try { res.json({ success: true, data: await listQuotationRecommendations(prismaClient, req.user, req.params.quotationId) }); } catch (error) { next(error); }
  },
  health: async (req, res, next) => {
    try { res.json({ success: true, data: await listDealHealth(prismaClient, req.user) }); } catch (error) { next(error); }
  },
  healthByDeal: async (req, res, next) => {
    try { res.json({ success: true, data: await getDealHealth(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
  rescue: async (req, res, next) => {
    try { res.json({ success: true, data: await listDealRescue(prismaClient, req.user) }); } catch (error) { next(error); }
  },
  rescueByDeal: async (req, res, next) => {
    try { res.json({ success: true, data: await getDealRescue(prismaClient, req.user, req.params.id) }); } catch (error) { next(error); }
  },
});
