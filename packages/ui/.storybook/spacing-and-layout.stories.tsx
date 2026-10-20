import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Doc, SpacingFoundation } from './foundations';

const meta = { title: 'Foundations/Spacing and layout', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guide: Story = {
  render: () => <Doc title="Spacing and layout"><SpacingFoundation /></Doc>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {name: 'Spacing and layout'})).toBeVisible();
  },
};
