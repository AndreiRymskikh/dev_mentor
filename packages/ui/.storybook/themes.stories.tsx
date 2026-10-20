import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent } from 'storybook/test';
import { Doc, ThemeFoundation, PortalProbe } from './foundations';

const meta = { title: 'Foundations/Themes', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guide: Story = {
  render: () => <Doc title="Themes"><ThemeFoundation /></Doc>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {name: 'Themes'})).toBeVisible();
  },
};

export const PortalInheritance: Story = {
  render: () => <Doc title="Root theme and body portals"><PortalProbe /></Doc>,
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', {name: 'Show theme inheritance specimen'});
    await userEvent.tab();
    await expect(checkbox).toHaveFocus();
    await userEvent.keyboard(' ');
    const portal = await within(document.body).findByLabelText('Theme inheritance specimen');
    await expect(document.documentElement.dataset.theme).toBe(globals.theme);
    const expected = document.createElement('span');
    expected.style.backgroundColor = 'var(--surface-card)';
    document.body.append(expected);
    await expect(getComputedStyle(portal).backgroundColor).toBe(getComputedStyle(expected).backgroundColor);
    expected.remove();
    await expect(portal.parentElement).toBe(document.body);
    await userEvent.keyboard(' ');
    await expect(within(document.body).queryByLabelText('Theme inheritance specimen')).toBeNull();
  },
};
