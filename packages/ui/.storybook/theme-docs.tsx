import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { useLayoutEffect, useState, type PropsWithChildren } from 'react';

/** TASK rule 9: docs and body portals share exactly the preview document root. */
export function ThemeDocsContainer({ context, children }: PropsWithChildren<DocsContainerProps>) {
  const story = context.componentStories()[0];
  const initial = context.getStoryContext(story).globals.theme;
  const [theme, setTheme] = useState(initial === 'dark' ? 'dark' : 'light');
  useLayoutEffect(() => {
    const update = ({globals}: {globals: Record<string, unknown>}) => setTheme(globals.theme === 'dark' ? 'dark' : 'light');
    context.channel.on(GLOBALS_UPDATED, update);
    return () => { context.channel.off(GLOBALS_UPDATED, update); };
  }, [context]);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = 'en';
  }, [theme]);
  return <DocsContainer context={context}>{children}</DocsContainer>;
}
