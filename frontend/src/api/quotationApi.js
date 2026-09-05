import { apiFetch } from "./api";

export const quotationApi = {
  getQuotations: async () => {
    return apiFetch("/quotations");
  },
  
  getQuotationById: async (id) => {
    return apiFetch(`/quotations/${id}`);
  },

  createQuotation: async (customerId, items) => {
    return apiFetch("/quotations", {
      method: "POST",
      body: JSON.stringify({ customerId, items }),
    });
  },

  updateQuotation: async (id, items) => {
    return apiFetch(`/quotations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  sendQuotation: async (id) => {
    return apiFetch(`/quotations/${id}/send`, {
      method: "POST",
    });
  }
};
