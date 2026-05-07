import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.API_PORT || '3005';
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    base: isProduction ? '/~aarohaa/Pizzeria_Pro/' : '/',

    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});