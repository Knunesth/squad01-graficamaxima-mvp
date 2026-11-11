import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/helpers/setup.js'],
      include: ['tests/**/*.test.{js,jsx}'],
      css: false,
      restoreMocks: true,
      coverage: {
        include: ['src/**/*.{js,jsx}'],
        exclude: ['tests/**/*.test.{js,jsx}', 'src/main.jsx'],
      },
    },
  }),
);
