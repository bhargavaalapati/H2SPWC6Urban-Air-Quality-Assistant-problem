import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/domain/air-quality/**/*.ts',
        'src/lib/**/*.ts',
        'src/services/open-meteo*.ts',
        'src/services/gemini-client.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/types.ts'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 82,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});