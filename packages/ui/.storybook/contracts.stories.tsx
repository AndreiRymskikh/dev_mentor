import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { PageShell } from '@devmentor/ui';
import { apiCall } from '@devmentor/ui/backend/api';
import { LoadingMessage } from '@devmentor/ui/backend/feedback';
import { Doc, Source } from './foundations';

const meta = { title: 'Design system/Technical notes' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const PackageComposition: Story = {
  render: () => <PageShell><Doc title="Package composition"><p>This uses the existing exported PageShell with the approved semantic background and foreground roles. No product screen has been implemented.</p><Source ids="ENG; approved Q4; A1/P2" /></Doc></PageShell>,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', {name: 'Package composition'})).toBeVisible();
    await expect(canvasElement.firstElementChild).toHaveClass('bg-background');
  },
};

export const ApiMockContract: Story = {
  parameters: {
    msw: [http.get('/api/storybook/session-request', () => HttpResponse.json({ok: true, data: {duration: 25, mentor: 'Alex Morgan'}}))],
  },
  render: () => <Doc title="API mock contract"><LoadingMessage message="The interaction test checks a fictional API response." /><p>Alex Morgan is fictional. This test exercises the existing apiCall helper against MSW; it does not add a production endpoint.</p><Source ids="BRIEF R01; ENG API envelope; TASK rule 7" /></Doc>,
  play: async () => {
    const result = await apiCall('/api/storybook/session-request');
    await expect(result).toEqual({ok: true, data: {duration: 25, mentor: 'Alex Morgan'}});
  },
};
