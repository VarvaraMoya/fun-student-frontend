import { defineConfig, loadEnv } from 'vite';

// Прокси отправляет запросы /api с фронтенда на Spring Boot.
// Поэтому для локального запуска не нужно менять CORS в бэкенде.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      proxy: {
        '/api': {
          target: env.BACKEND_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
