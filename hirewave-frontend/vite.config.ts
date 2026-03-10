import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
<<<<<<< HEAD
      },
      "/login": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/logout": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sanctum": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
=======
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                cookie.replace(/Domain=[^;]+;/, 'Domain=localhost;')
              );
            }
          });
        },
      },
      "/login": { target: "http://localhost:8000", changeOrigin: true },
      "/logout": { target: "http://localhost:8000", changeOrigin: true },
      "/sanctum": { target: "http://localhost:8000", changeOrigin: true },
      "/storage": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
>>>>>>> dev_stefano
