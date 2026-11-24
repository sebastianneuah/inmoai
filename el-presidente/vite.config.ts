import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: { globals: true, environment: 'node', testTimeout: 120000 },
} as any);
