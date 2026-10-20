import type { Meta,StoryObj } from '@storybook/react-vite';
import { expect,userEvent,within } from 'storybook/test';
import { Input } from '@devmentor/ui/components/ui/input';
import { FormField } from '@devmentor/ui/backend/fields';
import { Doc } from '../foundations';
import { State } from '../batch-one-helpers';

const meta={title:'Primitives/Input',component:Input,args:{type:'email',placeholder:'alex@example.com',autoComplete:'email'},argTypes:{density:{control:'select',options:['default','compact']}}} satisfies Meta<typeof Input>;
export default meta;type Story=StoryObj<typeof meta>;
export const Playground:Story={render:args=><Doc title="Input playground"><FormField label="Email" hint="Use the address you registered with.">{control=><Input {...args} {...control}/>}</FormField></Doc>};
export const Densities:Story={render:()=> <Doc title="Input density"><div className="ds-stack"><FormField label="Email">{control=><Input {...control} type="email"/>}</FormField><FormField label="Filter users" hint="Compact density is reserved for dense administrative rows.">{control=><Input {...control} density="compact" type="search"/>}</FormField></div></Doc>};
export const States:Story={render:()=> <Doc title="Input state matrix"><div className="ds-state-grid">{['default','hover','focus'].map(state=><State key={state} name={state}><FormField label={`Email — ${state}`}>{control=><Input {...control} data-preview-state={state} type="email"/>}</FormField></State>)}<FormField label="Email — disabled" disabled disabledReason="This address is managed by your account provider.">{control=><Input {...control} defaultValue="alex@example.com"/>}</FormField><FormField label="Email — read only" hint="Copy this address if needed.">{control=><Input {...control} readOnly defaultValue="alex@example.com"/>}</FormField><FormField label="Email — error" error="Enter an email address, such as alex@example.com.">{control=><Input {...control} type="email" defaultValue="alex"/>}</FormField></div></Doc>};
export const LongContent:Story={render:args=><Doc title="Long input content"><FormField label="Email address for your DevMentor account" hint="Long labels wrap; single-line values scroll within the input.">{control=><Input {...args} {...control} defaultValue="alex.migration-consultation@example.com"/>}</FormField></Doc>};
export const Narrow:Story={render:args=><Doc title="Input at narrow width"><div className="ds-narrow"><FormField label="Email address for your DevMentor account">{control=><Input {...args} {...control}/>}</FormField></div></Doc>};
export const Interaction:Story={...Playground,play:async({canvasElement})=>{const canvas=within(canvasElement);const input=canvas.getByRole('textbox',{name:'Email Optional'});await userEvent.click(canvas.getByText('Email'));await expect(input).toHaveFocus();await userEvent.type(input,'alex@example.com');await expect(input).toHaveValue('alex@example.com');await expect(input).toHaveAttribute('autocomplete','email');}};
