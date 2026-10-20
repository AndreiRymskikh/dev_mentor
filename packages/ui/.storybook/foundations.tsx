import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, CalendarDays, MessageSquare, CircleAlert } from 'lucide-react';
import tokenSource from '../src/tokens.css?raw';
import { colorPairs, contrast } from './contrast';

const names = [...new Set([...tokenSource.matchAll(/\s(--[\w-]+):/g)].map(match => match[1]).filter(name => !name.startsWith('--raw-')))];

function readTokens() {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map(name => [name.slice(2), styles.getPropertyValue(name).trim()]));
}

function useTokens() {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const update = () => setValues(readTokens());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('resize', update);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.addEventListener('change', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); reducedMotion.removeEventListener('change', update); };
  }, []);
  return values;
}

export function Source({ ids }: { ids: string }) {
  return <p className="ds-caption">Source: {ids}. Approval records: packages/ui/POSTEP.md; A1/P1/P2: lekcja-06/tokeny.md. Accessibility criteria: <a href="https://www.w3.org/TR/WCAG22/">WCAG 2.2</a>.</p>;
}

export function Doc({ title, children }: { title: string; children: ReactNode }) {
  return <article className="ds-doc ds-layout"><h1>{title}</h1>{children}</article>;
}

export function TokenTable({ tokens }: { tokens: string[] }) {
  const values = useTokens();
  return <div className="ds-scroll"><table><caption>Live computed token values in the selected theme and viewport</caption><thead><tr><th scope="col">Purpose token</th><th scope="col">Computed value</th></tr></thead><tbody>{tokens.map(token => <tr key={token}><th scope="row"><code>--{token}</code></th><td>{values[token] ?? 'Measuring…'}</td></tr>)}</tbody></table></div>;
}

export function ColorFoundation() {
  const values = useTokens();
  const colors = ['background','foreground','surface-card','surface-support','surface-inverse','text-muted','text-support','text-accent','text-inverse','text-inverse-muted','action-primary','action-primary-hover','text-on-action','border-subtle','border-control','focus-ring'];
  return <div className="ds-stack">
    <div className="ds-scroll"><table><caption>Role palette — values read from the actual CSS variables</caption><thead><tr><th scope="col">Role</th><th scope="col">Sample</th><th scope="col">Value</th><th scope="col">Use</th></tr></thead><tbody>{colors.map(token => <tr key={token}><th scope="row"><code>--{token}</code></th><td><span className="ds-swatch" style={{background: `var(--${token})`}} aria-hidden="true" /></td><td>{values[token] ?? 'Measuring…'}</td><td>{token === 'border-subtle' ? 'Decoration only; never essential control boundaries' : 'Use only with a paired role in the measured table below'}</td></tr>)}</tbody></table></div>
    <div className="ds-scroll"><table data-testid="contrast-table"><caption>Measured contrast — selected theme. Text: 4.5:1; interface: 3:1.</caption><thead><tr><th scope="col">Foreground</th><th scope="col">Background</th><th scope="col">Ratio</th><th scope="col">Required</th><th scope="col">Result</th></tr></thead><tbody>{colorPairs.map(([fg,bg,min]) => {
      const ratio = values[fg] && values[bg] ? contrast(values[fg],values[bg]) : undefined;
      return <tr key={`${fg}-${bg}`} data-contrast={ratio === undefined ? 'pending' : ratio >= min ? 'pass' : 'fail'}><th scope="row">{fg}</th><td>{bg}</td><td>{ratio?.toFixed(2) ?? 'Measuring…'}:1</td><td>{min}:1</td><td>{ratio === undefined ? 'Measuring…' : ratio >= min ? 'Pass' : 'FAIL — do not use'}</td></tr>;
    })}</tbody></table></div>
    <p>Restricted pair: light muted text on the support surface is 4.42:1 and fails normal-text contrast. Use <code>text-support</code> there instead (4.60:1). Subtle borders are decorative and may fall below 3:1. No other unlisted pairing is authorized.</p>
    <p>Choose the light or dark toolbar theme to measure each palette. Tests run both. A status always needs words or an icon plus an accessible name; color never carries meaning alone.</p><Source ids="A1, P1/P2; F04/F07; WCAG 1.4.1, 1.4.3, 1.4.11" />
  </div>;
}

export function TypographyFoundation() {
  const roles = [['Page heading','ds-role-heading','Find a mentor','font-size-page'],['Section heading','ds-role-section','Relevant experience','font-size-section'],['Body','ds-measure','Find someone who has worked through a problem like yours. Review their public work and price before requesting a session.','font-size-body'],['Label','ds-role-label','Session duration','font-size-label'],['Metadata','ds-role-metadata','Text session · mentor approval required','font-size-metadata'],['Numbers','ds-role-numbers','25 / 50 minutes','font-size-numbers'],['Code','ds-role-code','await requestSession(selectedSlot);','font-size-code'],['Marketing hero','ds-role-hero','A fresh perspective.','font-size-hero']];
  return <div className="ds-stack">{roles.map(([role,css,text,token]) => <section key={role} className="ds-sample"><h2>{role}</h2><p className={css}>{text}</p><TokenTable tokens={[token]} /></section>)}<Source ids="F01/F02; A1; BRIEF R01/D04" /></div>;
}

export function SpacingFoundation() {
  return <div className="ds-stack"><div className="ds-sample ds-stack ds-groups"><div className="ds-row ds-related"><span>25 minutes</span><span>Text session</span></div><p>A related group uses space-related. Separate topic groups use space-group. The panel uses space-panel internally.</p></div><TokenTable tokens={['space-related','space-group','space-panel','space-section','space-page-gutter','space-control-inline','space-inline','size-content-max','size-body-measure']} /><Source ids="A1 approved spacing scale; F02/F03/F06" /></div>;
}

export function ShapeFoundation() {
  return <div className="ds-stack"><div className="ds-control-guide ds-focus-guide">Control geometry specimen — not an interactive component</div><div className="ds-sample">Panel geometry. Decorative border; no general-purpose shadow.</div><pre className="ds-code-panel ds-role-code">{'// Code illustration is the depth exception.\nconst duration = 25;'}</pre><TokenTable tokens={['radius-control','radius-panel','code-panel-radius','border-width','focus-width','space-focus-offset','size-control','size-control-compact','size-textarea-min','code-panel-shadow']} /><Source ids="A1; P1; F03/F04/F08; WCAG 1.4.11, 2.4.7" /></div>;
}

export function MotionFoundation() {
  return <div className="ds-stack"><div className="ds-sample ds-motion-guide">Hover this documentation specimen: only background color transitions. It is not a button.</div><TokenTable tokens={['motion-duration-interaction']} /><p>With reduced motion requested, the computed duration is zero. Do not animate a loading skeleton by default. Busy content needs a retained label and an announcement, not decorative motion.</p><Source ids="F04/F08; WCAG 2.3.3 (AAA guidance), 4.1.3" /></div>;
}

export function IconsFoundation() {
  return <div className="ds-stack"><div className="ds-row"><MessageSquare aria-hidden="true" className="ds-icon-inline" /><span>Text session</span><CalendarDays aria-hidden="true" className="ds-icon-standalone" /><span>Choose an available slot</span><ArrowUpRight aria-hidden="true" className="ds-icon-inline" /><span>Public work</span><CircleAlert aria-hidden="true" className="ds-icon-standalone" /><span>Could not save. Check your connection and try again.</span></div><TokenTable tokens={['size-icon-inline','size-icon-standalone','size-icon-action','size-target-min']} /><p>These Lucide icons supplement words. Icon-only actions need an accessible name on the real control. Do not use tooltip-only instructions for essential information. Do not use emoji in place of product icons.</p><Source ids="F05; TASK anti-patterns; WCAG 1.1.1, 2.5.8, 4.1.2" /></div>;
}

export function ThemeFoundation() {
  const values = useTokens();
  return <div className="ds-stack"><div className="ds-sample"><p>The toolbar writes data-theme to the document root. A panel rendered under body receives the same tokens.</p><p data-testid="theme-report">Current theme: {values.background ? document.documentElement.dataset.theme : 'Measuring…'}</p></div><TokenTable tokens={['background','foreground','surface-card','text-muted','action-primary','text-on-action']} /><Source ids="P2; TASK rule 9; F04" /></div>;
}

/** Documentation-only portal probe, not a Dialog substitute or package component. */
export function PortalProbe() {
  const [visible,setVisible] = useState(false);
  return <div><label className="ds-row"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />Show theme inheritance specimen</label>{visible && createPortal(<aside className="ds-portaled" data-testid="portal-specimen" aria-label="Theme inheritance specimen">This documentation-only portal inherits the root theme. Clear the checkbox to close it.</aside>,document.body)}</div>;
}

export function LayoutFoundation() {
  return <div className="ds-stack">{[['narrow','320'],['medium','768'],['wide','1440']].map(([size,label]) => <section className={`ds-sample ds-layout ds-layout-${size}`} key={size}><h2>{label}px reference width</h2><p>Content stays fluid within the available viewport. At narrow widths, stack related groups and keep action labels readable.</p></section>)}<TokenTable tokens={['size-content-max','size-body-measure','space-page-gutter','space-section','size-layout-narrow','size-layout-medium','size-layout-wide']} /><Source ids="A1; F02/F06; WCAG 1.4.10" /></div>;
}

