import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import vm from 'node:vm';

test('the app stays behind its splash until the initial interface is ready', async () => {
 const read = name => fs.readFile(new URL(name, import.meta.url), 'utf8');
 const [html, css, bootstrap] = await Promise.all(['templates/index.html', 'style.css', 'bootstrap.js'].map(read));
 assert.match(html, /<body data-startup="loading">/);
 assert.match(html, /<section id="startup"/);
 assert.match(css, /body\[data-startup\] > main[\s\S]*?visibility: hidden/);

 for (const fail of [false, true]) {
  const body = {dataset: {startup: 'loading'}};
  const elements = new Map();
  const querySelector = selector => {
   if (!elements.has(selector)) elements.set(selector, {hidden: true});
   return elements.get(selector);
  };
  let releaseSession, startSession, releaseCatalog, startCatalog, finished = false;
  const sessionStarted = new Promise(resolve => { startSession = resolve; });
  const session = new Promise(resolve => { releaseSession = resolve; });
  const catalogStarted = new Promise(resolve => { startCatalog = resolve; });
  const catalog = new Promise(resolve => { releaseCatalog = resolve; });
  const loadModule = async path => {
   assert.equal(body.dataset.startup, 'loading', path);
   if (path === './storage.js') return {
    initialize: async () => { startSession(); await session; },
    finishInitialization: () => { finished = true; }
   };
   if (path === './app.js') {
    startCatalog();
    await catalog;
    if (fail) throw Error('Catalog unavailable');
   }
  };
  const run = vm.runInNewContext(
   `(async () => {${bootstrap.replace(/\bimport\(/g, 'loadModule(')}})()`,
   {document: {body, querySelector}, loadModule, console: {error() {}}}
  );
  await Promise.race([sessionStarted, run]);
  assert.equal(body.dataset.startup, 'loading');
  releaseSession();
  await Promise.race([catalogStarted, run]);
  assert.equal(body.dataset.startup, 'loading');
  releaseCatalog();
  await run;
  assert.equal(finished, !fail);
  assert.equal(body.dataset.startup, fail ? 'error' : undefined);
  assert.equal(querySelector('#startup-retry').hidden, !fail);
 }
});
test('one entry point initializes account before loading recipe-dependent interface',async()=>{
 const root=new URL('./',import.meta.url),html=await fs.readFile(new URL('index.html',root),'utf8'),boot=await fs.readFile(new URL('bootstrap.js',root),'utf8');
 assert.equal([...html.matchAll(/<script type="module"/g)].length,1,'Parallel interface entry can read catalog before account initialization');
 assert.match(boot,/await import\('\.\/interface.js'\)/,'Interface must be loaded by initialized bootstrap');
 assert.ok(boot.indexOf('await initialize()')<boot.indexOf("await import('./app.js')"));
 assert.ok(boot.indexOf("await import('./app.js')")<boot.indexOf("await import('./interface.js')"));
});
