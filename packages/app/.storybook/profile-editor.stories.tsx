import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, within } from "storybook/test";
import { ProfileEditor } from "../src/app/mentor/profile/profile-editor";
import "../src/app/mentor/profile/profile-editor.css";
import "@devmentor/ui/frames.css";
import { Workspace } from "../src/app/workspace";
import { Button } from "@devmentor/ui/components/ui/button";

const profile = { displayName: "Alex Laurent", bio: "I help you simplify complex types, untangle React state and decide how your API should respond.", publicWorkUrl: "https://github.com/example", stackTags: ["typescript", "react"], slug: "alex-laurent", publishedAt: "2026-10-31T10:00:00Z", readiness: [] };
const meta = { title: "Product/E02/Profile editor", component: ProfileEditor, decorators:[Story=><Workspace identity="Alex Laurent" roles={["mentor"]} current="profile" signOut={<Button variant="text">Sign out</Button>}><div className="dm-profile-page"><Story/></div></Workspace>], args: { origin: "https://devmentor.example", options: [{value:"typescript",label:"TypeScript"},{value:"react",label:"React"},{value:"python",label:"Python"},{value:"ai-agents",label:"AI agents"}] }, parameters: { msw: [http.get("/api/mentors/me", () => HttpResponse.json({ ok:true, data:profile }))] }, play: async ({canvasElement}) => { const canvas=within(canvasElement); await expect(await canvas.findByRole("heading",{name:"Show mentees how you can help"})).toBeVisible(); await expect(canvas.getByLabelText(/Display name/)).toHaveValue("Alex Laurent"); } } satisfies Meta<typeof ProfileEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Published:Story={};
export const Draft:Story={parameters:{msw:[http.get("/api/mentors/me",()=>HttpResponse.json({ok:true,data:{...profile,slug:null,publishedAt:null}}))]}};
export const Dark:Story={globals:{theme:"dark"}};
export const Mobile:Story={decorators:[Story=><div style={{maxWidth:320}}><Story/></div>]};
