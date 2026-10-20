import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Doc, IconsFoundation } from './foundations';

const meta = { title: 'Foundations/Icons', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guide: Story = {
  render: () => <Doc title="Icons"><IconsFoundation /></Doc>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {name: 'Icons'})).toBeVisible();
  },
};
