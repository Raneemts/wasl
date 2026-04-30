const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};

export const getRequests = (filters = {}) =>
  apiCall(`/requests?${new URLSearchParams(filters)}`);

export const getDonors = (filters = {}) =>
  apiCall(`/donors?${new URLSearchParams(filters)}`);

export const addDonor = (data) =>
  apiCall("/donors", { method: "POST", body: JSON.stringify(data) });

export const addRequest = (data) =>
  apiCall("/requests", { method: "POST", body: JSON.stringify(data) });

export const recordDonation = (data) =>
  apiCall("/donations", { method: "POST", body: JSON.stringify(data) });

export const getStats = () => apiCall("/stats");

export const findMatches = (requestId) =>
  apiCall(`/requests/${requestId}/matches`);
