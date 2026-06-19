import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    
    setupFiles: ['./src/test/setup.js'],
    
    globals: true,
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.js',
        '**/*.spec.js',
        'dist/',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules', 'dist'],
    
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
