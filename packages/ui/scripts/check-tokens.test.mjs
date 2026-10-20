import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { violations, check } from './check-tokens.mjs';

test('reports colors and palette/arbitrary utilities with exact lines', () => {
  const found = violations('color: #ffffff;\nbackground: oklch(0.5 0.1 20);\n<div className="bg-zinc-900 dark:text-white p-[13px]" />', 'src/example.tsx');
  assert.deepEqual(found.map(x => [x.line, x.rule]), [[1,'literal color'],[2,'literal color'],[3,'Tailwind palette'],[3,'Tailwind palette'],[3,'arbitrary Tailwind value']]);
  assert.equal(found[4].value,'p-[13px]');
});
test('catches raw consumption and named colors; accepts semantic roles and token declarations', () => {
  assert.equal(violations('background: white; color: rgb(1 2 3); padding: var(--raw-space-8)', 'src/style.css').length,3);
  assert.deepEqual(violations('color: #fff; padding: var(--raw-space-8)', 'src/tokens.css'),[]);
  assert.equal(violations('color: #fff', 'src/nested/tokens.css').length,1);
  assert.deepEqual(violations('const a = errors[field.name]; const b = values[token];', 'src/example.tsx'),[]);
  assert.deepEqual(violations('<div className="bg-background text-text-muted p-panel" />\ncolor: var(--foreground);', 'src/example.tsx'),[]);
});
test('scans authored docs as well as src and omits generated and vendor assets', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'devmentor-token-guard-'));
  try {
    for(const name of ['src','src/node_modules','.storybook','.storybook/public','docs']) fs.mkdirSync(path.join(root,name),{recursive:true});
    for(const name of ['src/example.tsx','.storybook/example.mdx','docs/example.tsx','docs/example.md','src/node_modules/vendor.ts','.storybook/public/generated.ts']) fs.writeFileSync(path.join(root,name),'text-white');
    assert.equal(check(root).length,4);
    assert.deepEqual(check(path.join(root,'missing')),[]);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
