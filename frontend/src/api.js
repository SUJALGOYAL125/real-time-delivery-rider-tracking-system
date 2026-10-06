import axios from "axios";

const API_URL = "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

// Runs before every request — attaches the token from localStorage,
// if one exists, without every component needing to do this manually.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;