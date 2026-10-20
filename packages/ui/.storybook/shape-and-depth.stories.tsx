import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Doc, ShapeFoundation } from './foundations';

const meta = { title: 'Foundations/Shape and depth', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Guide: Story = {
  render: () => <Doc title="Shape and depth"><ShapeFoundation /></Doc>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {name: 'Shape and depth'})).toBeVisible();
  },
};
