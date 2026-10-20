import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, colorPairs } from '../.storybook/contrast.ts';

test('WCAG contrast handles production-minified shorthand and computed RGB', () => {
  assert.equal(contrast('#fff','#000'),21);
  assert.equal(contrast('#ffffff','#000000'),21);
  assert.equal(contrast('rgb(255, 255, 255)','rgb(0, 0, 0)'),21);
  assert.equal(contrast('#627069','#627069'),1);
  assert.equal(contrast('#000','#fff'),21);
  assert.ok(contrast('#627069','#f6f7f2')>=4.5);
  assert.ok(contrast('#627069','#e9efdf')<4.5);
  assert.equal(colorPairs.length,24);
});
