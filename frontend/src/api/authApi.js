import { apiFetch, setAuthToken, removeAuthToken } from "./api";

export const authApi = {
  login: async (email, password) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    if (data.success && data.token) {
      setAuthToken(data.token);
    }
    
    return data;
  },
  
  logout: () => {
    removeAuthToken();
  }
};
