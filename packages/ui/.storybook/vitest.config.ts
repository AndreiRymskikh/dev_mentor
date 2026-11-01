import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { fileURLToPath } from 'node:url';

const configDir = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  test: {
    projects: ['light', 'dark'].map(theme => ({
      plugins: [storybookTest({ configDir, initialGlobals: { theme } })],
      resolve: { alias: { 'next/navigation': fileURLToPath(new URL('../../app/.storybook/navigation-mock.ts', import.meta.url)) } },
      optimizeDeps: { include: ['storybook/internal/core-events', '@storybook/addon-docs/blocks'] },
      test: {
        name: theme,
        browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
      },
    })),
  },
});
