import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import {
  createApprovalRequests,
  evaluateApproval,
} from "../src/services/approvalService.js";

process.env.JWT_SECRET = "test-secret";

let requests;
let quotations;
let server;
let baseUrl;

const requestRecord = (id, role, status = "PENDING") => ({
  id,
  quotationId: "quotation-1",
  requestedById: "sales-1",
  approverId: null,
  approvalRole: role,
  reason: "Discount exposure requires review",
  status,
  createdAt: "2026-01-01T00:00:00.000Z",
  resolvedAt: null,
  quotation: {
    id: "quotation-1",
    quotationNumber: "Q-1001",
    status: quotations["quotation-1"].status,
    salespersonId: "sales-1",
  },
  requestedBy: {
    id: "sales-1",
    name: "Salesperson",
    email: "sales@example.com",
    role: "SALESPERSON",
  },
  approver: null,
});

const prismaMock = {
  approvalRule: {
    findMany: async () => [
      {
        minBlendedDiscountPercent: "15",
        requiresLineViolation: false,
        requiresManager: true,
        requiresFinance: true,
        priority: 2,
      },
      {
        minBlendedDiscountPercent: "10",
        requiresLineViolation: false,
        requiresManager: true,
        requiresFinance: false,
        priority: 1,
      },
    ],
  },
  approvalRequest: {
    findMany: async ({ where }) =>
      Object.values(requests)
        .filter(
          (request) =>
            (!where.approvalRole ||
              request.approvalRole === where.approvalRole) &&
            (!where.status || request.status === where.status) &&
            (!where.requestedById ||
              request.requestedById === where.requestedById),
        )
        .map((request) => ({
          ...request,
          quotation: {
            ...request.quotation,
            status: quotations[request.quotationId].status,
          },
        })),
    findUnique: async ({ where }) => requests[where.id] || null,
    update: async ({ where, data }) => {
      requests[where.id] = { ...requests[where.id], ...data };
      return requests[where.id];
    },
    count: async ({ where }) =>
      Object.values(requests).filter(
        (request) =>
          request.quotationId === where.quotationId &&
          request.status === where.status,
      ).length,
  },
  quotation: {
    update: async ({ where, data }) => {
      quotations[where.id] = { ...quotations[where.id], ...data };
      return quotations[where.id];
    },
  },
  $transaction: async (callback) => callback(prismaMock),
};

const tokenFor = (id, role) =>
  jwt.sign({ sub: id, role }, process.env.JWT_SECRET);
const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);
const authenticated = (id, role) => ({
  headers: { authorization: `Bearer ${tokenFor(id, role)}` },
});

before(async () => {
  quotations = {
    "quotation-1": { id: "quotation-1", status: "PENDING_APPROVAL" },
  };
  requests = {
    "approval-manager": requestRecord("approval-manager", "MANAGER"),
    "approval-finance": requestRecord("approval-finance", "FINANCE"),
  };
  server = createApp(prismaMock).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe("approval decisions", () => {
  it("selects no approval, manager, and manager-plus-finance from configured thresholds", async () => {
    const none = await evaluateApproval(prismaMock, {
      blendedDiscountPercent: "5",
      hasLineViolations: false,
    });
    const manager = await evaluateApproval(prismaMock, {
      blendedDiscountPercent: "12",
      hasLineViolations: false,
    });
    const both = await evaluateApproval(prismaMock, {
      blendedDiscountPercent: "18",
      hasLineViolations: false,
    });

    assert.deepEqual(none.requiredRoles, []);
    assert.deepEqual(manager.requiredRoles, ["MANAGER"]);
    assert.deepEqual(both.requiredRoles, ["MANAGER", "FINANCE"]);
  });

  it("creates one pending request per required approval role", async () => {
    const created = [];
    const transaction = {
      approvalRequest: {
        create: async ({ data }) => {
          created.push(data);
          return data;
        },
      },
    };
    const decision = await evaluateApproval(prismaMock, {
      blendedDiscountPercent: "18",
      hasLineViolations: false,
    });
    await createApprovalRequests(
      transaction,
      "quotation-2",
      "sales-1",
      decision,
      {
        blendedDiscountPercent: "18",
        violatingLineCount: 0,
      },
    );

    assert.deepEqual(
      created.map((item) => item.approvalRole),
      ["MANAGER", "FINANCE"],
    );
    assert.equal(
      created.every((item) => item.quotationId === "quotation-2"),
      true,
    );
  });
});

describe("approval authorization and status", () => {
  it("scopes queues by role and rejects CUSTOMER/SALES approval access", async () => {
    const managerQueue = await request(
      "/api/approvals",
      authenticated("manager-1", "MANAGER"),
    );
    const salesQueue = await request(
      "/api/approvals",
      authenticated("sales-1", "SALESPERSON"),
    );
    const customerQueue = await request(
      "/api/approvals",
      authenticated("customer-1", "CUSTOMER"),
    );

    assert.equal(managerQueue.status, 200);
    assert.equal(
      (await managerQueue.json()).data.every(
        (item) => item.approvalRole === "MANAGER",
      ),
      true,
    );
    assert.equal(salesQueue.status, 403);
    assert.equal(customerQueue.status, 403);
  });

  it("prevents self-approval and allows the required manager", async () => {
    const selfApproval = await request(
      "/api/approvals/approval-manager/approve",
      { ...authenticated("sales-1", "MANAGER"), method: "POST" },
    );
    const managerApproval = await request(
      "/api/approvals/approval-manager/approve",
      { ...authenticated("manager-1", "MANAGER"), method: "POST" },
    );

    assert.equal(selfApproval.status, 403);
    assert.equal(managerApproval.status, 200);
    assert.equal(requests["approval-manager"].status, "APPROVED");
    assert.equal(quotations["quotation-1"].status, "PENDING_APPROVAL");
  });

  it("keeps multi-level approval pending until finance approves", async () => {
    const financeApproval = await request(
      "/api/approvals/approval-finance/approve",
      { ...authenticated("finance-1", "FINANCE"), method: "POST" },
    );

    assert.equal(financeApproval.status, 200);
    assert.equal(requests["approval-finance"].status, "APPROVED");
    assert.equal(quotations["quotation-1"].status, "APPROVED");
  });

  it("rejects already resolved requests and records rejection status", async () => {
    requests["approval-manager"].status = "REJECTED";
    const duplicate = await request("/api/approvals/approval-manager/approve", {
      ...authenticated("manager-1", "MANAGER"),
      method: "POST",
    });
    requests["approval-manager"].status = "PENDING";
    const rejected = await request("/api/approvals/approval-manager/reject", {
      ...authenticated("manager-1", "MANAGER"),
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenFor("manager-1", "MANAGER")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reason: "Discount is not commercially justified",
      }),
    });

    assert.equal(duplicate.status, 409);
    assert.equal(rejected.status, 200);
    assert.equal(requests["approval-manager"].status, "REJECTED");
    assert.equal(quotations["quotation-1"].status, "REJECTED");
  });
});
