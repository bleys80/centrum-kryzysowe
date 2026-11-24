/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serwuje apkę pod https://bleys80.github.io/centrum-kryzysowe/
export default defineConfig({
  base: '/centrum-kryzysowe/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
