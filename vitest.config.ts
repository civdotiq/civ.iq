/**
 * Vitest Configuration for Civic Intel Hub
 *
 * CRITICAL: This configuration ensures our data integrity tests run correctly
 * and catch coordinate system bugs before they reach production.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000, // 30 seconds for API tests
    hookTimeout: 30000,

    // Test file patterns
    include: [
      'src/tests/**/*.test.ts',
      'src/tests/**/*.test.tsx',
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.tsx',
    ],

    // Exclude patterns
    exclude: ['node_modules/**', 'dist/**', '.next/**', 'archived-features/**', 'e2e/**'],

    // Setup files
    setupFiles: [],

    // Coverage configuration (optional)
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/', '**/*.d.ts', '**/*.config.*', '**/coverage/**'],
    },

    // Reporter configuration
    reporter: process.env.CI ? 'github-actions' : 'verbose',

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      API_BASE_URL: 'http://localhost:3000',
    },
  },

  // Path resolution for imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './'),
    },
  },
});
