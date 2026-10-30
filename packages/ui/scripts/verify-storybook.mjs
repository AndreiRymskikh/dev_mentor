import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../storybook-static');
const artifacts = path.resolve(root, '../.storybook/test-results');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs':'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return; }
    const content = await fs.readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
let browser;
const results = [];
try {
  await fs.mkdir(artifacts, {recursive:true});
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  const errors=[];
  const consoleErrors=[];
  page.on('console', message => { if(message.type()==='error' && !message.text().includes('404')) consoleErrors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  const index = JSON.parse(await fs.readFile(path.join(root,'index.json'),'utf8'));
  const docs=Object.values(index.entries).filter(entry => entry.type==='docs');
  for (const theme of ['light','dark']) {
    for (const width of [320,768,1440]) {
      await page.setViewportSize({width,height:1000});
      for (const entry of docs) {
        await page.goto(`${origin}/iframe.html?id=${entry.id}&viewMode=docs&globals=theme:${theme}`);
        await page.locator('.ds-doc').first().waitFor();
        await page.evaluate(async () => {
          await Promise.all([document.fonts.load('16px "Inter Variable"'), document.fonts.load('14px "JetBrains Mono Variable"')]);
          await document.fonts.ready;
        });
        // Documentation-only pages without Canvas still get the selected root theme.
        const state=await page.evaluate(() => ({
          rootTheme: document.documentElement.dataset.theme,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          bodyFont: document.fonts.check('16px "Inter Variable"'),
          monoFont: document.fonts.check('14px "JetBrains Mono Variable"'),
          tables: [...document.querySelectorAll('table')].length,
          failedContrast: document.querySelectorAll('[data-contrast="fail"]').length,
          literalTable: document.body.innerText.includes('|---'),
          text: document.body.innerText,
        }));
        assert.equal(state.rootTheme,theme,`${entry.title}: root theme`);
        if(state.overflow) {
          console.error(await page.locator('*').evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth || node.getBoundingClientRect().right+window.scrollX>window.innerWidth).map(node=>({tag:node.tagName,class:node.className,text:node.textContent.slice(0,100),width:node.getBoundingClientRect().width,right:node.getBoundingClientRect().right+window.scrollX})).slice(-20)));
          await page.screenshot({path:path.join(artifacts,'overflow.png'),fullPage:true});
        }
        assert.equal(state.overflow,false,`${entry.title}: overflow at ${width}/${theme}`);
        assert.equal(state.bodyFont,true,'Local body font not loaded');
        assert.equal(state.monoFont,true,'Local mono font not loaded');
        assert.equal(state.failedContrast,0,`${entry.title}: failing built contrast`);
        assert.equal(state.literalTable,false,'MDX table rendered as pipe text');
        assert.ok(!state.text.includes('No Preview'),'Missing docs preview');
        results.push({page:entry.title,theme,width,tables:state.tables});
        if(width===1440 && entry.id==='foundations-color--docs') await page.screenshot({path:path.join(artifacts,`foundations-${theme}.png`),fullPage:true});
      }
    }
  }
  assert.deepEqual(errors,[],'Built docs have runtime errors');
  await page.goto(`${origin}/?path=/docs/foundations-color--docs`);
  await page.waitForLoadState('networkidle');
  await page.frameLocator('#storybook-preview-iframe').locator('.ds-doc').first().waitFor();
  await page.waitForFunction(() => document.title.includes('DevMentor') && !document.title.includes('Storybook'));
  await page.screenshot({path:path.join(artifacts,'manager.png'),fullPage:true});
  const managerText = await page.locator('body').innerText();
  assert.ok(managerText.includes('DevMentor'), `Manager branding did not render: ${managerText.slice(0,1000)}`);
  assert.deepEqual(errors, [], 'Manager runtime errors');
  assert.deepEqual(consoleErrors, [], 'Built docs or manager console errors');
  await page.screenshot({path:path.join(artifacts,'manager.png'),fullPage:true});
  console.log('Manager title:', await page.title());
  await page.getByRole('button', {name:'DevMentor theme'}).click();
  await page.getByText('Dark', {exact:true}).click();
  await page.frameLocator('#storybook-preview-iframe').locator('html[data-theme="dark"]').waitFor();
  await page.goto(`${origin}/iframe.html?id=foundations-motion--guide&viewMode=story&globals=theme:light`);
  await page.locator('.ds-motion-guide').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.ds-motion-guide')).transitionDuration==='0s');
  await page.getByRole('cell', {name:/^0m?s$/}).waitFor();
  await page.emulateMedia({reducedMotion:'no-preference'});

  assert.equal(await page.locator('[data-testid="onboarding-checklist"]').count(),0);
  assert.equal((await page.title()).includes('Storybook'),false);
  assert.equal((await page.locator('body').innerText()).includes('Storybook'),false);
  if (process.argv.includes('--dev')) {
    await page.goto(`http://127.0.0.1:6006/?path=/docs/${index.entries['primitives-button--docs']?'primitives-button--docs':'foundations-color--docs'}`);
    await page.frameLocator('#storybook-preview-iframe').locator('.ds-doc').first().waitFor();
    await page.waitForFunction(() => document.title.includes('DevMentor') && !document.title.includes('Storybook'));
    assert.equal((await page.locator('body').innerText()).includes('Onboarding'),false);
    await page.screenshot({path:path.join(artifacts,'dev-manager.png'),fullPage:true});
  }
  const batchResults=[];
  if(index.entries['primitives-button--states']) {
    for(const theme of ['light','dark']) {
      await page.setViewportSize({width:768,height:1000});
      const properties=['backgroundColor','color','borderColor','outlineWidth','outlineStyle','outlineColor','outlineOffset','textDecorationThickness'];
      const measure=locator=>locator.evaluate((element,keys)=>Object.fromEntries(keys.map(key=>[key,getComputedStyle(element)[key]])),properties);
      for(const [story,selector] of [['primitives-button--states','.dm-button'],['primitives-input--states','.dm-input'],['primitives-textarea--states','.dm-textarea'],['primitives-link-and-text-action--states','.dm-link']]) {
        await page.goto(`${origin}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
        const live=page.locator(`${selector}[data-preview-state="default"]`).first();
        await live.waitFor();
        await live.hover();
        await live.evaluate(async element=>{ await Promise.all(element.getAnimations().map(animation=>animation.finished)); });
        const hover=await measure(live);
        const frozenHover=await measure(page.locator(`${selector}[data-preview-state="hover"]`).first());
        for(const key of ['backgroundColor','color','borderColor','textDecorationThickness']) assert.equal(hover[key],frozenHover[key],`${story}: frozen hover ${key}`);
        await page.mouse.move(0,0);
        await live.focus();
        const focus=await measure(live);
        const frozenFocus=await measure(page.locator(`${selector}[data-preview-state="focus"]`).first());
        for(const key of ['outlineWidth','outlineStyle','outlineColor','outlineOffset']) assert.equal(focus[key],frozenFocus[key],`${story}: frozen focus ${key}`);
        if(selector==='.dm-input' || selector==='.dm-textarea') {
          const margin=await page.locator('.dm-help').first().evaluate(element=>getComputedStyle(element).marginBlockStart);
          assert.equal(margin,'0px','Documentation prose must not override field spacing');
        }
        batchResults.push({story,theme,hoverAndFocusMatch:true});
        if(selector==='.dm-input' || selector==='.dm-textarea') await page.screenshot({path:path.join(artifacts,`batch-one-${selector.slice(4)}-${theme}.png`),fullPage:true});
        if(selector==='.dm-link') {
          await page.keyboard.press('Enter');
          await page.waitForURL(url=>url.hash==='#public-work');
          assert.ok(await page.getByRole('heading',{name:'Public work destination'}).isVisible());
        }
      }
      await page.goto(`${origin}/iframe.html?id=primitives-formfield--interaction&viewMode=story&globals=theme:${theme}`);
      const input=page.getByRole('textbox',{name:'Email Required'});
      await input.waitFor();
      // Storybook runs the story's play function in a built preview as well.
      await page.waitForFunction(()=>document.querySelector('#validated-email')?.value==='alex@example.com' && document.querySelector('#validated-email')?.getAttribute('aria-invalid')==='false');
      await input.fill('');
      await input.press('Tab');
      await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('#validated-email')?.getAttribute('aria-invalid')==='true');
      assert.equal(await input.getAttribute('aria-invalid'),'true');
      assert.equal(await input.evaluate(element=>element===document.activeElement),true);
      await input.fill('alex@example.com');
      await page.keyboard.press('Tab');
      await page.waitForFunction(()=>document.querySelector('#validated-email')?.getAttribute('aria-invalid')==='false');
      assert.equal(await input.inputValue(),'alex@example.com');
      await page.goto(`${origin}/iframe.html?id=primitives-button--variants-and-sizes&viewMode=story&globals=theme:${theme}`);
      for(const [size,min] of [['default',48],['compact',40],['icon',40]]) {
        const control=page.locator(`button[data-size="${size}"]`).first();
        await control.waitFor();
        const box=await control.boundingBox();assert.ok(box.height>=min,`${size} target height`);
        if(size==='icon')assert.equal(box.width,40,'Icon target width');
      }
      await page.screenshot({path:path.join(artifacts,`batch-one-${theme}.png`),fullPage:true});
      await page.goto(`${origin}/iframe.html?id=primitives-input--densities&viewMode=story&globals=theme:${theme}`);
      for(const [density,min] of [['default',48],['compact',40]]) {
        const control=page.locator(`input[data-density="${density}"]`);
        await control.waitFor(); assert.equal((await control.boundingBox()).height,min,`Input ${density} height`);
      }
      await page.goto(`${origin}/iframe.html?id=primitives-textarea--playground&viewMode=story&globals=theme:${theme}`);
      const textarea=page.locator('textarea'); await textarea.waitFor();
      assert.ok((await textarea.boundingBox()).height>=128,'Textarea minimum height');
      assert.equal(await textarea.evaluate(element=>getComputedStyle(element).resize),'vertical');
    }
    for(const entry of docs.filter(entry=>entry.title.startsWith('Primitives/'))) {
      await page.goto(`${origin}/iframe.html?id=${entry.id}&viewMode=docs`);
      await page.locator('.ds-doc').first().waitFor();
      for(let number=1;number<=13;number++) assert.ok(await page.getByRole('heading',{name:new RegExp(`^${number}\\. `)}).count(),`${entry.title}: missing manual section ${number}`);
    }
  }

  const e01 = Object.values(index.entries).filter(entry => entry.type === 'story' && entry.title === 'Accounts/E01 screens');
  assert.equal(e01.length, 17, 'E01 state inventory');
  for (const theme of ['light', 'dark']) {
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      for (const entry of e01) {
        await page.goto(`${origin}/iframe.html?id=${entry.id}&viewMode=story&globals=theme:${theme}`);
        await page.locator('.dm-auth h1, .dm-workspace h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${entry.id} overflow at ${width}/${theme}`);
        if (entry.id.endsWith('--multi-role') && width <= 768) {
          const trigger = page.getByRole('button',{name:'Open navigation',exact:true});
          await trigger.click(); await page.getByRole('link',{name:'Operator home',exact:true}).waitFor();
          await page.keyboard.press('Escape'); await expectExpanded(false);
          assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
          async function expectExpanded(value) { assert.equal(await trigger.getAttribute('aria-expanded'),String(value)); }
        }
        if ([320,390,1440].includes(width)) await page.screenshot({path:path.join(artifacts,`${entry.id}-${theme}-${width}.png`),fullPage:true});
      }
    }
  }
  assert.deepEqual(errors, [], 'E01 runtime errors');
  console.log(`Verified ${e01.length} E01 states in both themes at 320, 390, 768 and 1440px.`);

  await fs.writeFile(path.join(artifacts,'built-docs-report.json'),JSON.stringify({pages:docs.length,checks:results.length,batchResults,runtimeErrors:errors,results},null,2)+'\n');
  console.log(`Verified ${docs.length} built documentation pages in both themes at 320, 768 and 1440px (${results.length} checks). Local fonts, root themes, overflow, MDX tables and runtime errors checked.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
