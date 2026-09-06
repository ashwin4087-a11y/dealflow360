const API_BASE = "http://localhost:5000/api";

export const getAuthToken = () => sessionStorage.getItem("dealflow_token");
export const setAuthToken = (token) => sessionStorage.setItem("dealflow_token", token);
export const removeAuthToken = () => sessionStorage.removeItem("dealflow_token");

export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
      // Optional: trigger event to force login redirect
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error(data.error || "An error occurred during the request");
  }

  return data;
};
