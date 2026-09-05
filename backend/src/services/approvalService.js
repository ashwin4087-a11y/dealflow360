const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const APPROVAL_ROLES = ["MANAGER", "FINANCE"];
const APPROVAL_REQUEST_FIELDS = {
  id: true,
  quotationId: true,
  requestedById: true,
  approverId: true,
  approvalRole: true,
  reason: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  quotation: {
    select: {
      id: true,
      quotationNumber: true,
      status: true,
      salespersonId: true,
    },
  },
  requestedBy: { select: { id: true, name: true, email: true, role: true } },
  approver: { select: { id: true, name: true, email: true, role: true } },
};

const requiredRoles = (rule) => {
  if (!rule) return [];
  const roles = [];
  if (rule.requiresManager) roles.push("MANAGER");
  if (rule.requiresFinance) roles.push("FINANCE");
  return roles;
};

export const evaluateApproval = async (prismaClient, risk) => {
  const rules = await prismaClient.approvalRule.findMany({
    where: { active: true },
    orderBy: [{ priority: "desc" }, { minBlendedDiscountPercent: "desc" }],
  });
  const matchingRule = rules.find(
    (rule) =>
      Number(risk.blendedDiscountPercent) >=
        Number(rule.minBlendedDiscountPercent) ||
      (rule.requiresLineViolation && risk.hasLineViolations),
  );
  const roles = requiredRoles(matchingRule);
  return {
    approvalRequired: roles.length > 0,
    requiredRoles: roles,
    rule: matchingRule || null,
  };
};

export const createApprovalRequests = async (
  transaction,
  quotationId,
  requestedById,
  decision,
  risk,
) => {
  if (!decision.approvalRequired) return [];
  const reason = `Approval required: blended discount ${risk.blendedDiscountPercent}% with ${risk.violatingLineCount} violating line(s)`;
  return Promise.all(
    decision.requiredRoles.map((approvalRole) =>
      transaction.approvalRequest.create({
        data: { quotationId, requestedById, approvalRole, reason },
        select: { id: true, approvalRole: true, status: true },
      }),
    ),
  );
};

export const listApprovals = async (prismaClient, user) => {
  const where =
    user.role === "ADMIN"
      ? {}
      : user.role === "MANAGER" || user.role === "FINANCE"
        ? { approvalRole: user.role, status: "PENDING" }
        : { requestedById: user.id };
  return prismaClient.approvalRequest.findMany({
    where,
    select: APPROVAL_REQUEST_FIELDS,
    orderBy: { createdAt: "desc" },
  });
};

export const getApproval = async (prismaClient, user, id) => {
  const request = await prismaClient.approvalRequest.findUnique({
    where: { id },
    select: APPROVAL_REQUEST_FIELDS,
  });
  if (!request) throw serviceError("Approval request not found", 404);
  if (
    user.role !== "ADMIN" &&
    request.requestedById !== user.id &&
    request.approvalRole !== user.role
  ) {
    throw serviceError("Insufficient permissions", 403);
  }
  return request;
};

const requireApprover = (request, user) => {
  if (request.status !== "PENDING")
    throw serviceError("Approval request is already resolved", 409);
  if (user.role !== request.approvalRole && user.role !== "ADMIN")
    throw serviceError("Insufficient permissions", 403);
  if (request.requestedById === user.id && user.role !== "ADMIN")
    throw serviceError("Self-approval is not allowed", 403);
};

export const resolveApproval = async (
  prismaClient,
  user,
  id,
  status,
  reason = "",
) => {
  return prismaClient.$transaction(async (transaction) => {
    const request = await transaction.approvalRequest.findUnique({
      where: { id },
      select: {
        id: true,
        quotationId: true,
        requestedById: true,
        approvalRole: true,
        status: true,
        quotation: { select: { id: true, status: true } },
      },
    });
    if (!request) throw serviceError("Approval request not found", 404);
    requireApprover(request, user);
    const resolved = await transaction.approvalRequest.update({
      where: { id },
      data: {
        status,
        approverId: user.id,
        reason:
          reason ||
          (status === "REJECTED"
            ? "Rejected by approver"
            : request.approvalRole),
        resolvedAt: new Date(),
      },
      select: { id: true, quotationId: true, approvalRole: true, status: true },
    });

    if (status === "REJECTED") {
      await transaction.quotation.update({
        where: { id: request.quotationId },
        data: { status: "REJECTED" },
      });
    } else {
      const pending = await transaction.approvalRequest.count({
        where: { quotationId: request.quotationId, status: "PENDING" },
      });
      if (pending === 0) {
        await transaction.quotation.update({
          where: { id: request.quotationId },
          data: { status: "APPROVED" },
        });
      }
    }
    return resolved;
  });
};

export { APPROVAL_ROLES, APPROVAL_REQUEST_FIELDS };
