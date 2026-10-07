/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React - loaded on every page
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }

          // 3D libraries - only loaded when visiting 3D customizer (lazy route)
          if (
            id.includes('node_modules/three') ||
            id.includes('node_modules/@react-three/fiber') ||
            id.includes('node_modules/@react-three/drei')
          ) {
            return '3d-vendor';
          }

          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          // UI libraries (Radix, etc.)
          if (id.includes('node_modules/@radix-ui')) {
            return 'ui-vendor';
          }
          // React Query & utilities
          if (id.includes('node_modules/@tanstack/react-query') || id.includes('node_modules/sonner')) {
            return 'utils-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
