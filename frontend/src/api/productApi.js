import { apiFetch } from "./api";

export const productApi = {
  getProducts: async () => {
    return apiFetch("/products");
  }
};
