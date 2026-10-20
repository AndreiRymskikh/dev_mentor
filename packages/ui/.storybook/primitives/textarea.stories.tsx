import type { Meta,StoryObj } from '@storybook/react-vite';
import { expect,userEvent,within } from 'storybook/test';
import { Textarea } from '@devmentor/ui/components/ui/textarea';
import { FormField } from '@devmentor/ui/backend/fields';
import { Doc } from '../foundations';

const meta={title:'Primitives/Textarea',component:Textarea,args:{placeholder:'Describe which explanation helped you move forward.',maxLength:500}} satisfies Meta<typeof Textarea>;
export default meta;type Story=StoryObj<typeof meta>;
export const Playground:Story={render:args=><Doc title="Textarea playground"><FormField label="Session feedback" hint="Example only: feedback is collected after the service.">{control=><Textarea {...args} {...control}/>}</FormField></Doc>};
export const States:Story={render:()=> <Doc title="Textarea state matrix"><div className="ds-state-grid">{['default','hover','focus'].map(state=><FormField key={state} label={`Feedback — ${state}`}>{control=><Textarea {...control} data-preview-state={state}/>}</FormField>)}<FormField label="Feedback — disabled" disabled disabledReason="The mentor has not provided the service yet.">{control=><Textarea {...control}/>}</FormField><FormField label="Feedback — read only">{control=><Textarea {...control} readOnly defaultValue="The explanation clarified the TypeScript issue."/>}</FormField><FormField label="Feedback — error" error="Describe your experience before submitting.">{control=><Textarea {...control}/>}</FormField></div></Doc>};
export const LongContent:Story={render:args=><Doc title="Long feedback"><FormField label="What changed after this consultation?" hint="This fictional text does not represent a customer testimonial.">{control=><Textarea {...args} {...control} defaultValue={'The mentor walked through a small reproduction of the TypeScript issue. I now understand the constraint and can continue checking the migration. '.repeat(4)}/>}</FormField></Doc>};
export const Narrow:Story={render:args=><Doc title="Textarea at narrow width"><div className="ds-narrow"><FormField label="What helped you move forward with your technical problem?">{control=><Textarea {...args} {...control}/>}</FormField></div></Doc>};
export const Interaction:Story={...Playground,play:async({canvasElement})=>{const textbox=within(canvasElement).getByRole('textbox',{name:'Session feedback Optional'});await userEvent.type(textbox,'A smaller reproduction clarified the issue.');await expect(textbox).toHaveValue('A smaller reproduction clarified the issue.');await expect(textbox).toHaveAttribute('maxlength','500');}};
