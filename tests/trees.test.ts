import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {treeBlocksView} from '../src/trees';
const box=new Box3(new Vector3(-1,0,4),new Vector3(1,5,6));
test('foreground tree clears a low camera sightline',()=>{
 assert.equal(treeBlocksView(box,new Vector3(0,2,10),[new Vector3(0,1,0)]),true);
});
test('background trees remain visible beyond the target',()=>{
 assert.equal(treeBlocksView(box,new Vector3(0,2,-10),[new Vector3(0,1,0)]),false);
});
test('high and side views retain trees outside the sightline',()=>{
 assert.equal(treeBlocksView(box,new Vector3(0,20,10),[new Vector3(0,0,0)]),false);
 assert.equal(treeBlocksView(box,new Vector3(10,2,10),[new Vector3(10,1,0)]),false);
});
test('camera inside a canopy clears it even when looking away',()=>{
 assert.equal(treeBlocksView(box,new Vector3(0,3,5),[new Vector3(0,3,10)]),true);
});
test('ball outside the court can trigger clearance independently',()=>{
 assert.equal(treeBlocksView(box,new Vector3(0,2,10),[new Vector3(10,1,0),new Vector3(0,4,0)]),true);
});
