import {
  getApproval,
  listApprovals,
  resolveApproval,
} from "../services/approvalService.js";

export const createApprovalController = (prismaClient) => ({
  list: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await listApprovals(prismaClient, req.user),
      });
    } catch (error) {
      next(error);
    }
  },
  get: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getApproval(prismaClient, req.user, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
  approve: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await resolveApproval(
          prismaClient,
          req.user,
          req.params.id,
          "APPROVED",
        ),
      });
    } catch (error) {
      next(error);
    }
  },
  reject: async (req, res, next) => {
    try {
      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      res.json({
        success: true,
        data: await resolveApproval(
          prismaClient,
          req.user,
          req.params.id,
          "REJECTED",
          reason,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
});
