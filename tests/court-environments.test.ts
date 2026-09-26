import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as THREE from 'three';
import {CityRooftop,GlowballHall,CostaRicanJungle} from '../src/court-environments';
import {COURT_LOCATIONS,LOCATION_PALETTES,isCourtLocation,courtName} from '../src/locations';
import {createPickleball,setPickleballGlow} from '../src/pickleball';
import {OpenPlayStore} from '../src/persistence/open-play-store';
import {Match} from '../src/match';
import {parseSoloLaunch} from '../src/solo-launch';
import {newPlayer} from '../src/player-design';

test('every court has a palette, a picker image, and a distinct display name',()=>{
 assert.equal(new Set(COURT_LOCATIONS.map(c=>c.id)).size,6);
 for(const court of COURT_LOCATIONS){assert.ok(LOCATION_PALETTES[court.id]);assert.ok(existsSync(new URL('../public'+court.image,import.meta.url)));assert.ok(isCourtLocation(court.id));assert.ok(courtName(court.id));}
 for(const value of [undefined,null,'unknown','toString',{}])assert.equal(isCourtLocation(value),false);
});
for(const [id,Environment] of [['city',CityRooftop],['glowball',GlowballHall],['jungle',CostaRicanJungle]] as const){
 test(`${id} has finite scenery, batches geometry, and fades obstructions`,()=>{
  const environment=new Environment();let meshes=0;
  environment.group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox!;assert.ok([...b.min,...b.max].every(Number.isFinite));}});
  assert.ok(meshes>20);assert.ok(meshes<650,`${meshes} meshes should stay within the scenery budget`);
  const camera=new THREE.PerspectiveCamera();camera.position.set(0,15,22);environment.update(camera,[new THREE.Vector3(0,1,0)]);
  environment.group.traverse(o=>{if(o instanceof THREE.Mesh)assert.ok(Number.isFinite(o.material.opacity))});
  if(id==='city')assert.ok(new THREE.Box3().setFromObject(environment.group).min.y<-50);
  if(id==='jungle')for(const animal of ['toucan','white-faced-capuchin','three-toed-sloth','jaguar'])assert.ok(environment.group.getObjectByName(animal));
 });
 test(`${id} survives solo launch and local game persistence`,()=>{
  const players={you:newPlayer('a'),partner:newPlayer('b'),'opponent-left':newPlayer('c'),'opponent-right':newPlayer('d')};
  const launch=parseSoloLaunch({players,court:id,target:5,scoring:'rally-doubles'});assert.equal(launch.court,id);
  const data=new Map<string,string>();const store=new OpenPlayStore({getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value)},removeItem:key=>{data.delete(key)}},'court-test');
  const checkpoint=new Match().exportCheckpoint();store.save(checkpoint,id);assert.equal(store.load(checkpoint.matchId)?.court,id);
 });
}
test('Glowball brightens the perforated ball and restores normal lighting on exit',()=>{
 const ball=createPickleball(),shell=ball.children[0] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>,geometry=shell.geometry;
 const original=shell.material.emissiveIntensity;setPickleballGlow(ball,true);assert.ok(shell.material.emissiveIntensity>2);assert.equal(shell.geometry,geometry);assert.ok(shell.customDepthMaterial);
 setPickleballGlow(ball,false);assert.equal(shell.material.emissiveIntensity,original);
});
