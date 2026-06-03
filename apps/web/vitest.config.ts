import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    coverage: {
      provider: 'v8',
      include: [
        'app/**/*', 
        'widgets/**/*', 
        'features/**/*', 
        'entities/**/*', 
        'shared/**/*'
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        'components/ui/**',
        '**/*.d.ts',
        '**/*.test.tsx',
        '**/*.test.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
});