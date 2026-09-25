import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original?.url?.includes("/api/auth/refresh");

    // A 401 from the refresh endpoint itself just means "not logged in" (e.g.
    // AuthBootstrap's silent check on first load for an anonymous visitor).
    // Retrying-via-refresh here would recurse into the same 401 and, on
    // failure, hard-redirect to /login on every page (including /login
    // itself), reloading the whole app and re-running AuthBootstrap forever.
    if (isRefreshCall || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
            {},
            { withCredentials: true },
          )
          .then((res) => res.data.access_token)
          .finally(() => {
            refreshPromise = null;
          });
      }
      const newToken = await refreshPromise;
      useAuthStore.getState().setAccessToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return client(original);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    }
  },
);
