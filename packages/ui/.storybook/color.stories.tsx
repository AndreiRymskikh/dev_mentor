import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Doc, ColorFoundation } from './foundations';

const meta = { title: 'Foundations/Color', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guide: Story = {
  render: () => <Doc title="Color"><ColorFoundation /></Doc>,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-contrast="pass"]')).toHaveLength(24));
    await expect(canvasElement.querySelectorAll('[data-contrast="fail"]')).toHaveLength(0);
  },
};
