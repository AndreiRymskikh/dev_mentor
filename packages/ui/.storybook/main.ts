import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['./docs/**/*.mdx', './**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest', '@storybook/addon-themes', 'msw-storybook-addon'],
  staticDirs: ['./public'],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // Manager bundles do not support Vite's ?raw CSS imports. Read the canonical file at build time.
  managerHead: head => `${head}<style>${readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8')} a[href*="path=/settings/about"] { display: none; }</style>`,
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(config, { plugins: [tailwindcss()], optimizeDeps: { include: ['storybook/internal/core-events', '@storybook/addon-docs/blocks'] } });
  },
};
export default config;
