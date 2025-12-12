import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Laravel Sanctum
axiosClient.defaults.withCredentials = true;
axiosClient.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

// XSRF cookie
axiosClient.defaults.xsrfCookieName = "XSRF-TOKEN";
axiosClient.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Interceptor per leggere il cookie XSRF
axiosClient.interceptors.request.use((config) => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    config.headers["X-XSRF-TOKEN"] = token;
  }
  return config;
});

export default axiosClient;