import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyFunTheme,customizeFunPiece,FUN_THEMES,isCourtTheme} from '../src/fun-themes';
import {newPlayer,validatePlayer} from '../src/player-design';
import {premiumAppearance,changedPremiumChoices} from '../src/premium-appearance';
import {FunCourt} from '../src/fun-court';
import {Match} from '../src/match';
import {parseCheckpoint} from '../src/engine/checkpoint';
import {parseSoloLaunch} from '../src/solo-launch';

test('theme presets preserve identity and survive player, launch, and checkpoint validation',()=>{
 const p=newPlayer('test'),original=structuredClone(p);p.appearance=applyFunTheme(p.appearance,'horrified',1);
 assert.equal(p.appearance.skin,original.appearance.skin);assert.deepEqual(p.skills,original.skills);
 assert.equal(validatePlayer(p).appearance.funVariant,1);
 const launch=parseSoloLaunch({players:{you:p,partner:p,'opponent-left':p,'opponent-right':p},court:'venice',courtTheme:'fairy',scoring:'rally-doubles',target:11});assert.equal(launch.courtTheme,'fairy');
 const match=new Match();match.courtTheme='eighties';const restored=Match.fromCheckpoint(match.exportCheckpoint());assert.equal(restored.courtTheme,'eighties');assert.equal(restored.exportCheckpoint().courtTheme,'eighties');
 assert.throws(()=>parseCheckpoint({...match.exportCheckpoint(),courtTheme:'bad'}));assert.throws(()=>validatePlayer({...p,appearance:{...p.appearance,funVariant:4}}));assert.equal(isCourtTheme('bad'),false);
 assert.equal(Match.fromCheckpoint(new Match().exportCheckpoint()).courtTheme,'none');
});
test('Fun access is independent from Style and unowned render copies leave saved looks intact',()=>{
 const a=applyFunTheme(newPlayer().appearance,'disco');
 assert.equal(premiumAppearance(a,['fun']).funTheme,'disco');assert.equal(premiumAppearance(a,['everything']).funTheme,'disco');assert.equal(premiumAppearance(a,['style']).funTheme,undefined);assert.equal(a.funTheme,'disco');
 assert.equal(changedPremiumChoices(undefined,a,['style']),true);assert.equal(changedPremiumChoices(undefined,a,['fun']),false);
});
test('manual pieces can replace themed clothing without removing the remaining preset',()=>{
 const a=applyFunTheme(newPlayer().appearance,'eighties');customizeFunPiece(a,'top');customizeFunPiece(a,'bottomColor');
 assert.deepEqual(a.funOverrides,['top','bottom']);assert.equal(a.funTheme,'eighties');customizeFunPiece(a,'paddleShape');assert.equal(a.funPaddle,'none');
 assert.deepEqual(applyFunTheme(a,'eighties').funOverrides,[]);
});
test('all 3D theme modules animate, remain finite, and dispose every geometry on replacement',()=>{
 for(const theme of FUN_THEMES){const court=new FunCourt(theme.id),scene=new THREE.Scene();scene.add(court.group);let meshes=0,disposed=0;
 court.group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;o.geometry.addEventListener('dispose',()=>disposed++);assert.ok(o.geometry.attributes.position.count>0)}});
 assert.ok(meshes>10);court.animate(6,false);court.animate(6,true);court.update(new THREE.PerspectiveCamera(),[new THREE.Vector3(0,1,0)]);
 court.group.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));court.dispose();assert.equal(court.group.parent,null);assert.equal(disposed,meshes);
 }
});
