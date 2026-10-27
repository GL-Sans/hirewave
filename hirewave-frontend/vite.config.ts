import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://localhost:8000";

// xfwd: inoltra al backend l'host aperto dal browser (localhost, IP di rete o tunnel),
// così i redirect di Google/LinkedIn/Stripe tornano allo stesso indirizzo
const backendProxy = { target: BACKEND, changeOrigin: true, xfwd: true };

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Consente l'accesso tramite tunnel HTTPS (necessario per il login social da telefono)
    allowedHosts: [".ngrok-free.app", ".ngrok.app", ".trycloudflare.com"],
    proxy: {
      "/api": {
        ...backendProxy,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                cookie.replace(/Domain=[^;]+;/, 'Domain=localhost;')
              );
            }
          });
        },
      },
      "/login": backendProxy,
      "/logout": backendProxy,
      "/sanctum": backendProxy,
      "/storage": backendProxy,
    },
  },
});
