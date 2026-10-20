import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ArrowRight } from 'lucide-react';
import { Button } from '@devmentor/ui/components/ui/button';
import { Doc } from '../foundations';
import { State } from '../batch-one-helpers';

const meta={title:'Primitives/Button',component:Button,args:{children:'Request session',onClick:fn()},argTypes:{variant:{control:'select',options:['primary','text']},size:{control:'select',options:['default','compact','icon']},loading:{control:'boolean'},disabled:{control:'boolean'},disabledReason:{control:'text'}}} satisfies Meta<typeof Button>;
export default meta;type Story=StoryObj<typeof meta>;
export const Playground:Story={};
export const VariantsAndSizes:Story={render:()=> <Doc title="Button variants and sizes"><div className="ds-state-grid">{(['primary','text'] as const).flatMap(variant=>(['default','compact','icon'] as const).map(size=><State key={`${variant}-${size}`} name={`${variant} / ${size}`}><Button variant={variant} size={size} aria-label={size==='icon'?'Open session details':undefined}>{size==='icon'?<ArrowRight aria-hidden="true"/>:'Request session'}</Button></State>))}</div></Doc>};
export const States:Story={render:()=> <Doc title="Button state matrix"><div className="ds-state-grid">{(['default','hover','focus','pressed'] as const).map(state=><State key={state} name={state}><Button data-preview-state={state}>Request session</Button></State>)}<State name="Disabled"><Button disabled disabledReason="Select an available time first.">Request session</Button></State><State name="Loading"><Button loading>Request session</Button></State><State name="Selected toggle"><Button variant="text" aria-pressed="true">Show available times</Button></State><State name="Error guidance"><p role="alert">The request was not saved. Check your connection and try again.</p><Button>Try again</Button></State></div></Doc>};
export const LongContent:Story={args:{children:'Request a text session about the TypeScript migration and authentication boundaries'}};
export const Narrow:Story={render:()=> <Doc title="Button at narrow width"><div className="ds-narrow"><Button>Request a text session about the TypeScript migration and authentication boundaries</Button></div></Doc>};
export const Interaction:Story={play:async({canvasElement,args})=>{const button=within(canvasElement).getByRole('button',{name:'Request session'});await userEvent.tab();await expect(button).toHaveFocus();await userEvent.keyboard('{Enter}');await userEvent.keyboard(' ');await expect(args.onClick).toHaveBeenCalledTimes(2);}};
export const BusyAndDisabled:Story={args:{loading:true,onClick:fn()},play:async({canvasElement,args})=>{const canvas=within(canvasElement);await expect(canvas.getByRole('button',{name:'Request session'})).toBeDisabled();await expect(canvas.getByRole('status')).toHaveTextContent('In progress');await userEvent.click(canvas.getByRole('button'));await expect(args.onClick).not.toHaveBeenCalled();}};
