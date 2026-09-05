import { apiFetch } from "./api";

export const approvalApi = {
  getPendingApprovals: async () => {
    return apiFetch("/approvals");
  },
  
  approveQuotation: async (id, notes) => {
    return apiFetch(`/approvals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  rejectQuotation: async (id, notes) => {
    return apiFetch(`/approvals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  }
};
