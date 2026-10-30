import { useState } from "react";
import { CodeXml, ShieldCheck } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { AuthFrame, WorkspaceFrame } from "../src/backend/frames";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Link } from "../src/components/ui/link";
import { FormField } from "../src/backend/fields";
const meta = { title: "Accounts/E01 screens", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function AuthExample({ register = false, expired = false, pending = false, error = false }: { register?: boolean; expired?: boolean; pending?: boolean; error?: boolean }) {
  const [github, setGithub] = useState(false);
  return <AuthFrame><div className="grid gap-group"><h1>{register ? "Create your account" : "Welcome back"}</h1><p className="dm-auth-intro">{register ? "Get started with text mentoring for developers." : "Sign in to open your workspace."}</p>{expired && <div className="dm-status dm-status-warning" role="status"><strong>Your session has expired</strong><p>Sign in again to continue.</p></div>}<Button className="dm-github" variant="text" onClick={() => setGithub(true)}><CodeXml aria-hidden="true" />Continue with GitHub</Button>{github && <p role="status">GitHub sign-in will be implemented soon.</p>}<div className="dm-auth-divider">or use your email</div>{register && <FormField label="Display name" required>{control => <Input {...control} autoComplete="nickname" />}</FormField>}<FormField label="Email address" required>{control => <Input {...control} type="email" autoComplete="email" />}</FormField><FormField label="Password" required hint={register ? "Use 12–72 UTF-8 bytes. Some characters use more than one byte." : undefined}>{control => <Input {...control} type="password" autoComplete={register ? "new-password" : "current-password"} />}</FormField>{error && <p role="alert">Unable to reach the server. Please try again.</p>}<Button loading={pending}>{register ? "Create account" : "Sign in"}</Button><nav aria-label="Account help" className="flex flex-wrap gap-group">{register ? <Link href="/login">Sign in</Link> : <><span>New to DevMentor?</span><Link href="/register">Create account</Link><Link href="/forgot-password">Forgot password?</Link><Link href="/verify-email">Resend verification email</Link></>}</nav><Link className="dm-auth-home" href="/">Back to home</Link></div></AuthFrame>;
}
export const SignIn: Story = { render: () => <AuthExample /> };
export const CreateAccount: Story = { render: () => <AuthExample register /> };
export const CheckInbox: Story = { render: () => <AuthFrame><h1>Check your inbox</h1><p>If this address can be registered, a verification email will arrive shortly.</p><p>Verify your email using the link, then sign in.</p><Link href="/register">Change email</Link><Link href="/verify-email">Request another verification email</Link><Link href="/login">Sign in</Link></AuthFrame> };
export const EmailVerified: Story = { render: () => <AuthFrame><h1>Your email is verified</h1><div className="dm-status dm-status-success" role="status">Email verified. Sign in to continue.</div><Link className="dm-button dm-button-primary dm-size-default dm-primary-link" href="/account">Open my workspace</Link><Link href="/login">Sign in</Link></AuthFrame> };
export const SessionExpired: Story = { render: () => <AuthExample expired /> };
export const MobileExpired: Story = { ...SessionExpired, globals: { viewport: { value: "mobile1", isRotated: false } } };
export const Pending: Story = { render: () => <AuthExample pending /> };
export const NetworkFailure: Story = { render: () => <AuthExample error /> };
export const InvalidVerification: Story = { render: () => <AuthFrame><h1>Verify your email</h1><p role="alert">The link may be invalid, expired or already used. Request a new email.</p><Link href="/verify-email">Request another verification email</Link></AuthFrame> };
const multi = ["developer", "mentor", "administrator"];
function Home({ operator = false, roles = ["developer"] }: { operator?: boolean; roles?: string[] }) {
  return <WorkspaceFrame identity="Storybook member" roles={roles} current={operator ? "operator" : "account"} signOut={<Button variant="text" className="dm-logout">Sign out</Button>}><h1>{operator ? "Operator workspace" : "My sessions"}</h1>{operator ? <section className="dm-workspace-panel grid gap-group"><ShieldCheck aria-hidden="true" /><h2>Manage workspace access</h2><p>Only administrators can grant operator access. Verified users can choose to become mentors from their account.</p><Link className="dm-button dm-button-primary dm-size-default dm-primary-link" href="/admin/users">View users</Link></section> : <section className="dm-workspace-panel dm-empty-sessions"><h2>Sessions are not available yet</h2><p>Find a mentor and choose a time when the mentor catalog becomes available.</p><Button disabled disabledReason="The mentor catalog is not available yet.">Find a mentor</Button></section>}</WorkspaceFrame>;
}
export const MenteeFirstHome: Story = { render: () => <Home />, play: async ({ canvasElement }) => { await expect(within(canvasElement).getByRole("heading", { name: "My sessions" })).toBeVisible(); } };
export const OperatorHome: Story = { render: () => <Home operator roles={["developer", "administrator"]} /> };
export const MultiRole: Story = { render: () => <Home roles={multi} /> };
export const Users: Story = { render: () => <WorkspaceFrame identity="Storybook operator" roles={multi} current="users" signOut={<Button>Sign out</Button>}><h1>Users</h1><div className="dm-workspace-panel dm-workspace-table" role="region" aria-label="Users table"><table><thead><tr><th>Name</th><th>Email</th><th>Payout setup</th><th>Roles</th></tr></thead><tbody><tr><td>Storybook member</td><td>member@example.test</td><td>Not available</td><td>Mentee, Mentor</td></tr></tbody></table></div></WorkspaceFrame> };
export const LoadingUsers: Story = { render: () => <WorkspaceFrame identity="Storybook operator" roles={multi} current="users" signOut={<Button>Sign out</Button>}><h1>Users</h1><p role="status">Loading users…</p></WorkspaceFrame> };
export const EmptyUsers: Story = { render: () => <WorkspaceFrame identity="Storybook operator" roles={multi} current="users" signOut={<Button>Sign out</Button>}><h1>Users</h1><p>No results.</p></WorkspaceFrame> };
export const Forbidden: Story = { render: () => <AuthFrame><h1>Access denied</h1><p>Administrator access is required.</p><Link href="/account">Your account</Link></AuthFrame> };
export const MentorDependencyBlocked: Story = { render: () => <WorkspaceFrame identity="Storybook mentor" roles={multi} current="mentor" signOut={<Button>Sign out</Button>}><h1>Mentor home — dependency preview</h1><p>Full E01-06 is blocked until E02 price and availability policies and owner APIs are delivered.</p><p>Production retains the existing profile onboarding. This story does not claim working prices, slots, occupancy, cancellation or payouts.</p></WorkspaceFrame> };
