import test from 'node:test';import assert from 'node:assert/strict';import {scrollSpeed} from './drag-scroll.js';
test('scrolls upwards at top, downwards at bottom, stops centrally',()=>{assert.ok(scrollSpeed(20,0,700)<0);assert.ok(scrollSpeed(680,0,700)>0);assert.equal(scrollSpeed(350,0,700),0);assert.ok(Math.abs(scrollSpeed(5,0,700))>Math.abs(scrollSpeed(100,0,700)));});
test('clipped mobile viewport and outside pointer retain bounded direction',()=>{assert.equal(scrollSpeed(-50,40,600),-1000);assert.equal(scrollSpeed(800,40,600),1000);assert.equal(scrollSpeed(5,10,10),0);});
