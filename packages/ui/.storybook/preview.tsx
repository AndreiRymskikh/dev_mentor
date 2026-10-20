import type { Preview } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { setupWorker } from 'msw/browser';
import '../src/styles.css';
import './docs.css';
import { ThemeDocsContainer } from './theme-docs';



const preview: Preview = {
  globalTypes: {
    theme: { description: 'DevMentor theme', toolbar: { title: 'Theme', icon: 'circlehollow', items: [{ value: 'light', title: 'Light' }, { value: 'dark', title: 'Dark' }], dynamicTitle: true } },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    a11y: { test: 'error' },
    docs: { container: ThemeDocsContainer },
    layout: 'fullscreen',
    options: { storySort: { order: ['Design system', 'Foundations', 'Primitives', 'Product', 'Patterns'] } },
  },
  loaders: [mswLoader(async () => {
    const worker = setupWorker();
    await worker.start({ quiet: true, onUnhandledFrame({frame, defaults}) {
      // MSW 3: fail unmatched API calls; allow navigation and static resources.
      const data = frame.data;
      if (typeof data === 'object' && data !== null && 'request' in data && data.request instanceof Request && new URL(data.request.url).pathname.startsWith('/api/')) defaults.error();
    } });
    return worker;
  })],
  decorators: [(Story, context) => {
    const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
    useLayoutEffect(() => {
      // F01/F04 + TASK rule 9: portals under body inherit the root theme.
      document.documentElement.dataset.theme = theme;
      document.documentElement.lang = 'en';
    }, [theme]);
    return <Story />;
  }],
};
export default preview;
