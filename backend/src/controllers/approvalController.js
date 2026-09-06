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
  getRules: async (req, res, next) => {
    try {
      const rules = await prismaClient.approvalRule.findMany({ orderBy: { priority: "desc" } });
      res.json({ success: true, data: rules });
    } catch (error) { next(error); }
  },
  saveRules: async (req, res, next) => {
    try {
      const { rules } = req.body;
      await prismaClient.$transaction(async (tx) => {
        await tx.approvalRule.deleteMany({});
        if (rules && rules.length > 0) {
          const cleanRules = rules.map(r => {
            const { id, createdAt, updatedAt, ...rest } = r;
            return rest;
          });
          await tx.approvalRule.createMany({ data: cleanRules });
        }
      });
      const updated = await prismaClient.approvalRule.findMany({ orderBy: { priority: "desc" } });
      res.json({ success: true, data: updated });
    } catch (error) { next(error); }
  },
});
