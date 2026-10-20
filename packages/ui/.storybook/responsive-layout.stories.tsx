import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Doc, LayoutFoundation } from './foundations';

const meta = { title: 'Foundations/Responsive layout', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guide: Story = {
  render: () => <Doc title="Responsive layout"><LayoutFoundation /></Doc>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {name: 'Responsive layout'})).toBeVisible();
  },
};
