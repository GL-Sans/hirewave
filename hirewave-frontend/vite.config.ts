import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://localhost:8000";

// xfwd: inoltra al backend l'host aperto dal browser (localhost, IP di rete o tunnel),
// così i redirect di Google/LinkedIn/Stripe tornano allo stesso indirizzo
const backendProxy = { target: BACKEND, changeOrigin: true, xfwd: true };

/**
 * Content-Security-Policy nella build di produzione: il browser esegue solo
 * gli script del sito (niente script iniettati o esterni). Non in sviluppo,
 * dove Vite usa script inline per il ricaricamento a caldo.
 * frame-ancestors non funziona nel meta: va impostato anche dal server web
 * (header Content-Security-Policy: frame-ancestors 'none').
 */
function contentSecurityPolicy(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // style inline: React usa attributi style (es. barra del rating)
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return {
    name: "hirewave-csp",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
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
      // /login e /logout NON vanno inoltrati: sono pagine dell'app (il login usa /api/login)
      "/sanctum": backendProxy,
      "/storage": backendProxy,
      // Percorsi esca (vedi HoneypotController): chi li prova su questo indirizzo
      // viene registrato e bloccato dal backend
      "^/(\\.env|\\.git/|wp-login\\.php|wp-admin|wp-content|wp-config\\.php|xmlrpc\\.php|phpmyadmin|pma$|adminer\\.php|administrator|admin\\.php|config\\.php|server-status|cgi-bin|shell\\.php|[a-z]*\\.sql$|_ignition)": backendProxy,
    },
  },
});
