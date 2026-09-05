import { apiFetch } from "./api";

export const fulfillmentApi = {
  getOrderFulfillment: (orderId) => apiFetch(`/fulfillment/orders/${orderId}`),
  getRecords: (orderId) => apiFetch(`/fulfillment/records${orderId ? `?orderId=${orderId}` : ""}`),
  confirmFulfillment: (allocationId, data) =>
    apiFetch(`/fulfillment/allocations/${allocationId}/confirm`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const allocationApi = {
  getOrderAllocations: (orderId) => apiFetch(`/allocations/orders/${orderId}`),
  getItemAllocations: (orderItemId) => apiFetch(`/allocations/order-items/${orderItemId}`),
  recommend: (orderItemId) => apiFetch(`/allocations/order-items/${orderItemId}/recommendation`),
  replace: (orderItemId, data) =>
    apiFetch(`/allocations/order-items/${orderItemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const backorderApi = {
  getEligible: () => apiFetch("/backorders/eligible"),
  getByOrder: (orderId) => apiFetch(`/backorders/orders/${orderId}`),
  getById: (id) => apiFetch(`/backorders/${id}`),
  fulfill: (id, data) =>
    apiFetch(`/backorders/${id}/fulfill`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancel: (id) =>
    apiFetch(`/backorders/${id}/cancel`, { method: "POST" }),
};

export const inventoryApi = {
  getWarehouses: () => apiFetch("/inventory/warehouses"),
  getWarehouse: (id) => apiFetch(`/inventory/warehouses/${id}`),
  getStock: () => apiFetch("/inventory/stock"),
  getProductStock: (productId) => apiFetch(`/inventory/products/${productId}/stock`),
};
