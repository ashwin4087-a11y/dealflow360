import { apiFetch } from './api';

export const subscriptionApi = {
  getSubscriptions: async () => {
    try {
      const data = await apiFetch('/subscriptions');
      return data;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }
  },

  getSubscription: async (id) => {
    try {
      const data = await apiFetch(`/subscriptions/${id}`);
      return data;
    } catch (error) {
      console.error(`Error fetching subscription ${id}:`, error);
      throw error;
    }
  }
};
