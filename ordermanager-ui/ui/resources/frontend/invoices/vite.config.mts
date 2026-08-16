/// <reference types="vitest" />

import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'ag-grid-angular': 'ag-grid-angular/fesm2015/ag-grid-angular.js',
    },
  },
  plugins: [
    angular({
      tsconfig: 'tsconfig.spec.json',
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/frontend',
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
