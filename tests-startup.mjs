import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
test('one entry point initializes account before loading recipe-dependent interface',async()=>{
 const root=new URL('./',import.meta.url),html=await fs.readFile(new URL('index.html',root),'utf8'),boot=await fs.readFile(new URL('bootstrap.js',root),'utf8');
 assert.equal([...html.matchAll(/<script type="module"/g)].length,1,'Parallel interface entry can read catalog before account initialization');
 assert.match(boot,/await import\('\.\/interface.js'\)/,'Interface must be loaded by initialized bootstrap');
 assert.ok(boot.indexOf('await initialize()')<boot.indexOf("await import('./app.js')"));
 assert.ok(boot.indexOf("await import('./app.js')")<boot.indexOf("await import('./interface.js')"));
});
