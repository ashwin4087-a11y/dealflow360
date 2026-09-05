import { apiFetch } from './api';

export const invoiceApi = {
  getInvoices: async () => {
    try {
      const data = await apiFetch('/invoices');
      return data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  getInvoice: async (id) => {
    try {
      const data = await apiFetch(`/invoices/${id}`);
      return data;
    } catch (error) {
      console.error(`Error fetching invoice ${id}:`, error);
      throw error;
    }
  },

  payInvoice: async (id, paymentData) => {
    try {
      const data = await apiFetch(`/invoices/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      return data;
    } catch (error) {
      console.error(`Error paying invoice ${id}:`, error);
      throw error;
    }
  }
};
