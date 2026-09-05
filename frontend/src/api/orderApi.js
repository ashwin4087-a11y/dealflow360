import { apiFetch } from "./api";

export const orderApi = {
  getOrders: async () => {
    // Note: Assuming there is a GET /api/orders backend endpoint
    // If it doesn't exist, this might fail, but we'll try it
    return apiFetch("/orders");
  }
};
