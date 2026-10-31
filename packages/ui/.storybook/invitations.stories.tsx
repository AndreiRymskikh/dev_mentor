import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { InvitationView } from "../src/components/invitations/InvitationView";
import { Button } from "../src/components/ui/button";
import { Link } from "../src/components/ui/link";
import "../src/frames.css";

const meta = { title: "Product/E02/Invitation", component: InvitationView, parameters: { layout: "fullscreen" } } satisfies Meta<typeof InvitationView>;
export default meta;
type Story = StoryObj<typeof meta>;
const args = { account: <Link href="/login">Sign in</Link>, children: <><h2>You’re invited to mentor</h2><p>Publish your page, set both session prices and add your first bookable time within 10 days of accepting.</p><p>Invitation for invited@example.test</p><p>Accept before 9 November 2026, 12:00 UTC. Your publication deadline starts when you accept.</p><Link href="/login">Sign in to accept</Link><p>Invitations are optional. Verified users can also become mentors from their account.</p></> };
export const SignedOut: Story = { args, play: async ({ canvasElement }) => { await expect(within(canvasElement).getByRole("heading", { level: 1 })).toBeVisible(); await expect(within(canvasElement).getByRole("link", { name: "Sign in to accept" })).toBeVisible(); } };
export const MatchingAccount: Story = { args: { ...args, account: <Link href="/account">Your account</Link>, children: <><h2>You’re invited to mentor</h2><p>Accept as Invited engineer. Your existing roles stay available.</p><Button>Accept invitation</Button></> } };
export const Pending: Story = { args: { ...args, children: <><h2>You’re invited to mentor</h2><Button loading disabled>Accepting invitation…</Button></> } };
export const Retry: Story = { args: { ...args, children: <><h2>You’re invited to mentor</h2><p role="alert">Unable to accept. Please try again.</p><Button>Accept invitation</Button></> } };
export const Denied: Story = { args: { ...args, children: <><h2>You’re invited to mentor</h2><p role="alert">Sign out and sign in with the invited email address to accept.</p><Link href="/account">Manage your account</Link></> } };
export const Invalid: Story = { args: { ...args, children: <><h2>This invitation is not valid</h2><p>Ask the person who invited you for a new link.</p><Link href="/account">Your account</Link></> } };
export const LongNarrow: Story = { args: { ...args, children: <><h2>You’re invited to mentor</h2><p>Invitation for {"long-address".repeat(8)}@example.test</p><Button>Accept invitation</Button></> }, decorators: [Story => <div style={{ maxWidth: 320 }}><Story /></div>] };
export const Dark: Story = { args, globals: { theme: "dark" } };
