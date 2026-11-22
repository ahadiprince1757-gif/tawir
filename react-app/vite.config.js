import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Render backend URL — live service on Render
const RENDER_BACKEND_URL = 'https://tawir-1.onrender.com';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // In production builds (Vercel), inject VITE_API_URL if not already set via dashboard
  define: mode === 'production' ? {
    // Only define if the env var isn't already provided (Vercel dashboard takes priority)
    ...(process.env.VITE_API_URL ? {} : {
      'import.meta.env.VITE_API_URL': JSON.stringify(RENDER_BACKEND_URL),
    }),
  } : {},

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
}));
