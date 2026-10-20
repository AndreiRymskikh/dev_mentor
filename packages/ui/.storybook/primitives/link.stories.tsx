import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect,fn,userEvent,within } from 'storybook/test';
import { useId, type MouseEvent } from 'react';
import { Link } from '@devmentor/ui/components/ui/link';
import { Button } from '@devmentor/ui/components/ui/button';
import { Doc } from '../foundations';
import { State } from '../batch-one-helpers';

const meta={title:'Primitives/Link and text action',component:Link,args:{href:'#public-work',children:'View public work',onClick:fn((event:MouseEvent<HTMLAnchorElement>)=>event.preventDefault())},argTypes:{href:{control:'text'},target:{control:'select',options:['_self','_blank']}}} satisfies Meta<typeof Link>;
export default meta;type Story=StoryObj<typeof meta>;
export const Playground:Story={render:function LinkExample(args){const id=useId()+"-public-work";return <Doc title="Link playground"><Link {...args} href={args.href==='#public-work'?`#${id}`:args.href}/><section id={id}><h2>Public work</h2><p>Fictional example: a technical write-up about a TypeScript migration.</p></section></Doc>;}};
export const NavigationAndAction:Story={render:()=> <Doc title="Navigation or an action"><div className="ds-stack"><Link href="mailto:support@example.com">Contact external support</Link><Link href="https://example.com/public-work" target="_blank">View public work (opens in a new tab)</Link><Button variant="text">Clear search</Button></div></Doc>};
export const States:Story={render:()=> <Doc title="Link state matrix"><div className="ds-state-grid">{['default','hover','focus','pressed'].map(state=><State key={state} name={state}><Link href="#public-work" data-preview-state={state}>View public work</Link></State>)}<State name="Unavailable destination"><p>The mentor has not added a public-work link. Do not render a disabled or empty link.</p></State><section id="public-work"><h2>Public work destination</h2></section></div></Doc>};
export const LongContent:Story={args:{children:'Read the mentor’s public write-up about migrating a TypeScript application without losing authentication boundaries'}};
export const Narrow:Story={render:args=><Doc title="Link at narrow width"><div className="ds-narrow"><Link {...args}>Read the mentor’s public write-up about migrating a TypeScript application without losing authentication boundaries</Link></div></Doc>};
export const Interaction:Story={...Playground,play:async({canvasElement,args})=>{const link=within(canvasElement).getByRole('link',{name:'View public work'});await userEvent.tab();await expect(link).toHaveFocus();await expect(link).toHaveAttribute('href',expect.stringContaining('public-work'));await userEvent.keyboard('{Enter}');await expect(args.onClick).toHaveBeenCalledTimes(1);await expect(within(canvasElement).getByRole('heading',{name:'Public work'})).toBeVisible();}};
