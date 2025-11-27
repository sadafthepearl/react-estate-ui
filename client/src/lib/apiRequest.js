// ...existing code...
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8800/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies to backend (keep true if server uses cookie auth)
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore localStorage errors
  }
  return config;
});

export default api;
// ...existing code...
