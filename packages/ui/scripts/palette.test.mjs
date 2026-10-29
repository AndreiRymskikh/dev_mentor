import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contrast, colorPairs } from '../.storybook/contrast.ts';

const css = fs.readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
const declarations = block => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
const light = declarations(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
const explicitDark = declarations(css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)[1]);
const automaticDark = declarations(css.match(/:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n  \}/)[1]);
function resolve(tokens, name) {
  const value = tokens[name];
  assert.ok(value, `Missing token: ${name}`);
  const reference = value.match(/^var\(--([\w-]+)\)$/);
  return reference ? resolve(tokens, reference[1]) : value;
}

test('light semantic colours match the E01/E02 screenshot palette', () => {
  for (const [role, value] of Object.entries({ background: '#f7f7f7', foreground: '#171717', 'surface-card': '#ffffff', 'text-muted': '#5c5c5c', 'action-primary': '#335cff', 'surface-support': '#ecf0ff', 'border-subtle': '#ebebeb' })) {
    assert.equal(resolve(light, role), value, role);
  }
});

test('both themes meet every supported contrast pair and OS dark matches explicit dark', () => {
  assert.deepEqual(automaticDark, explicitDark);
  for (const [theme, tokens] of [['light', light], ['dark', { ...light, ...explicitDark }]]) {
    for (const [foreground, background, minimum] of colorPairs) {
      const ratio = contrast(resolve(tokens, foreground), resolve(tokens, background));
      assert.ok(ratio >= minimum, `${theme}: ${foreground}/${background} is ${ratio}, expected ${minimum}`);
    }
  }
});
