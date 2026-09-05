import { getDealHealth, listDealHealth } from "./dealHealthService.js";

const playbooks = {
  "Excessive discount": {
    action: "Offer service value instead of additional discount",
    reason: "The deal is carrying a high concession that threatens commercial value.",
    expectedImpact: "Protects price realization while preserving customer momentum.",
    approvalRequired: true,
    priority: "HIGH",
  },
  "Discount requires governance review": {
    action: "Prepare an approval-ready commercial rationale",
    reason: "The discount has crossed the configured governance threshold.",
    expectedImpact: "Reduces approval delay and clarifies the value exchange.",
    approvalRequired: true,
    priority: "MEDIUM",
  },
  "Approval is pending": {
    action: "Escalate the pending approval to the assigned approver",
    reason: "The quotation cannot progress while approval remains unresolved.",
    expectedImpact: "Shortens approval aging and restores deal movement.",
    approvalRequired: false,
    priority: "HIGH",
  },
  "Negotiation has stalled": {
    action: "Change payment terms or service scope rather than price",
    reason: "The negotiation has not changed within the configured aging window.",
    expectedImpact: "Creates a new commercial path without further margin pressure.",
    approvalRequired: true,
    priority: "HIGH",
  },
  "Deal inactive for 14 or more days": {
    action: "Trigger a customer follow-up with a revised proposal",
    reason: "The quotation has been inactive long enough to threaten forecast timing.",
    expectedImpact: "Re-establishes customer momentum and clarifies next steps.",
    approvalRequired: false,
    priority: "MEDIUM",
  },
  "Deal has not changed for 7 or more days": {
    action: "Schedule a focused deal review with the customer",
    reason: "Recent inactivity indicates weakening engagement.",
    expectedImpact: "Improves response cadence and surfaces the next decision.",
    approvalRequired: false,
    priority: "LOW",
  },
};

const buildActions = (health) => health.rootCauses.map((cause) => ({
  quotationId: health.quotationId,
  quotationNumber: health.quotationNumber,
  ...playbooks[cause],
})).filter((action) => action.action);

export const listDealRescue = async (prismaClient, user) => {
  if (user.role === "CUSTOMER") return [];
  const health = await listDealHealth(prismaClient, user);
  return health.flatMap(buildActions);
};

export const getDealRescue = async (prismaClient, user, quotationId) => {
  if (user.role === "CUSTOMER") return [];
  const health = await getDealHealth(prismaClient, user, quotationId);
  return buildActions(health);
};
