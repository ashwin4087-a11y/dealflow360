import { apiFetch } from "./api";

export const customerApi = {
  getCustomers: async () => {
    return apiFetch("/customers");
  },
  
  getCustomerById: async (id) => {
    return apiFetch(`/customers/${id}`);
  }
};
