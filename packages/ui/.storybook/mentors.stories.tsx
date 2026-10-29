import type { Meta, StoryObj } from "@storybook/react-vite";
import { MentorPageView } from "../src/components/mentors/MentorPageView";
const meta={title:"Mentors/Public profile",component:MentorPageView,args:{displayName:"Ada — systems mentor",bio:"I build reliable TypeScript systems and help developers make difficult changes safely.",publicWorkUrl:"https://github.com/example",tags:["TypeScript","React","Python","AI agents"]}} satisfies Meta<typeof MentorPageView>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Published:Story={};
export const DraftPreview:Story={args:{bio:null,publicWorkUrl:null,tags:[],heading:"h3"}};
export const LongContent:Story={args:{displayName:"A mentor with a long display name that wraps on narrow screens",bio:"I help teams reason about unfamiliar code and test their assumptions. ".repeat(20)}};
