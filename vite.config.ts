import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// GitHub Pages serve em https://USER.github.io/WRCAD/ — Vite precisa saber
// desse subpath pra ajustar os caminhos dos assets buildados. Em dev (pnpm dev)
// usamos '/' (raiz), em build/CI usamos '/WRCAD/'.
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProduction ? '/WRCAD/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
