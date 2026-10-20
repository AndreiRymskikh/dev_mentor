import type { Meta,StoryObj } from '@storybook/react-vite';
import { expect,userEvent,within } from 'storybook/test';
import { useId } from 'react';
import { Label } from '@devmentor/ui/components/ui/label';
import { Input } from '@devmentor/ui/components/ui/input';
import { Doc } from '../foundations';

const meta={title:'Primitives/Label',component:Label,args:{children:'Email',htmlFor:'label-example'}} satisfies Meta<typeof Label>;
export default meta;type Story=StoryObj<typeof meta>;
export const Playground:Story={render:function LabelExample(args){const id=useId();return <Doc title="Label playground"><div className="dm-field"><Label {...args} htmlFor={id}/><Input id={id} type="email"/></div></Doc>;}};
export const States:Story={render:()=> <Doc title="Label state guidance"><div className="ds-stack"><div className="dm-field"><Label htmlFor="label-enabled">Email</Label><Input id="label-enabled"/></div><div className="dm-field"><Label htmlFor="label-disabled">Email managed by provider</Label><Input id="label-disabled" disabled aria-describedby="label-disabled-reason"/><p id="label-disabled-reason" className="dm-help">This address is managed by your account provider.</p></div><p>Label has no independent hover, focus, pressed, selected, loading or error state. Focus and errors belong to its control and FormField.</p></div></Doc>};
export const LongContent:Story={...Playground,args:{children:'Email address associated with the account you use for technical consultations'}};
export const Narrow:Story={render:()=> <Doc title="Label at narrow width"><div className="ds-narrow dm-field"><Label htmlFor="label-narrow">Email address associated with the account you use for technical consultations</Label><Input id="label-narrow" type="email"/></div></Doc>};
export const Interaction:Story={...Playground,play:async({canvasElement})=>{const canvas=within(canvasElement);await userEvent.click(canvas.getByText('Email'));await expect(canvas.getByRole('textbox',{name:'Email'})).toHaveFocus();}};
