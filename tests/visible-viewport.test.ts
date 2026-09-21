import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleViewport} from '../src/visible-viewport';

function screen(viewport?:{offsetLeft:number;offsetTop:number;width:number;height:number}){
 const win={innerWidth:390,innerHeight:844,visualViewport:viewport} as unknown as Window;
 Object.assign(win,{parent:win});
 return win;
}
test('keyboard bounds follow both viewport shrinking and Safari panning',()=>{
 const win=screen({offsetLeft:0,offsetTop:180,width:390,height:360});
 assert.deepEqual(visibleViewport(win),{left:0,top:180,width:390,height:360});
});
test('embedded games use the parent keyboard viewport in frame coordinates',()=>{
 const parent=screen({offsetLeft:0,offsetTop:120,width:390,height:360});
 const child=screen({offsetLeft:0,offsetTop:0,width:390,height:844});
 Object.assign(child,{parent,frameElement:{getBoundingClientRect:()=>({left:0,top:40,width:390,height:804})}});
 assert.deepEqual(visibleViewport(child),{left:0,top:80,width:390,height:360});
});
test('keyboard dismissal restores the full viewport',()=>{
 const win=screen({offsetLeft:0,offsetTop:100,width:390,height:360});
 Object.assign(win.visualViewport!,{offsetTop:0,height:844});
 assert.deepEqual(visibleViewport(win),{left:0,top:0,width:390,height:844});
});
test('browsers without VisualViewport use window dimensions',()=>{
 assert.deepEqual(visibleViewport(screen()),{left:0,top:0,width:390,height:844});
});
