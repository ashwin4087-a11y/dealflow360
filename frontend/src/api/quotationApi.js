import { apiFetch } from "./api";

export const quotationApi = {
  getQuotations: async () => {
    return apiFetch("/quotations");
  },
  
  getQuotationById: async (id) => {
    return apiFetch(`/quotations/${id}`);
  },

  previewQuotation: async (id, items) => {
    return apiFetch(`/quotations/${id}/simulate`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  createQuotation: async (customerId, items) => {
    return apiFetch("/quotations", {
      method: "POST",
      body: JSON.stringify({ customerId, items }),
    });
  },

  updateQuotation: async (id, items, customerId) => {
    return apiFetch(`/quotations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ customerId, items }),
    });
  },

  sendQuotation: async (id) => {
    return apiFetch(`/quotations/${id}/send`, {
      method: "POST",
    });
  }
};
