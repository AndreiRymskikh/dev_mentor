import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
// A1/P1: managerHead loads the canonical tokens; consume semantic computed roles.
document.documentElement.dataset.theme = 'light';
function tokenValue(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}
addons.setConfig({
  theme: create({ base: 'light', brandTitle: 'DevMentor', brandUrl: '?path=/docs/foundations-color--docs', brandTarget: '_self', colorPrimary: tokenValue('action-primary'), colorSecondary: tokenValue('text-accent'), appBg: tokenValue('background'), appContentBg: tokenValue('surface-card'), textColor: tokenValue('foreground'), textMutedColor: tokenValue('text-muted') }),
});
document.title = 'DevMentor';

// TASK rule 10: this installed manager hardcodes its title suffix after navigation.
// Keep the useful page title while replacing that suffix with the product name.
const title = document.querySelector('title');
if (title) new MutationObserver(() => {
  const next = document.title.replaceAll('Storybook', 'DevMentor');
  if (next !== document.title) document.title = next;
}).observe(title, { childList: true, characterData: true, subtree: true });
