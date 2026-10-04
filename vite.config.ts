import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Serves netlify/functions/api.mts at /api during `npm run dev`, so local dev matches production
// without the Netlify CLI. DATABASE_URL is read from .env here and never reaches the browser
// bundle (only VITE_-prefixed variables are exposed to client code).
const devApi = (): Plugin => ({
  name: 'nuts-dev-api',
  configureServer(server) {
    const env = loadEnv('development', process.cwd(), '');
    if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;

    server.middlewares.use('/api', async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = Buffer.concat(chunks);

        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
        }
        const request = new Request(`http://${req.headers.host}/api`, {
          method: req.method,
          headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        });

        const mod = await server.ssrLoadModule('/netlify/functions/api.mts');
        const response: Response = await mod.default(request);

        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          if (key !== 'set-cookie') res.setHeader(key, value);
        });
        res.setHeader('set-cookie', response.headers.getSetCookie());
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        console.error('[dev api]', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Dev API failed to load.' }));
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
