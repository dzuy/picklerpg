import * as THREE from 'three';

// Preserve the gameplay marker's radius; the shell and holes are visual only.
const RADIUS = .092;
const THICKNESS = .004;
const HOLE_ANGLE = .135;
const HOLE_COUNT = 40;
const holeDirections = Array.from({length:HOLE_COUNT},(_,i)=>{
 const y=1-2*(i+.5)/HOLE_COUNT;
 const angle=i*Math.PI*(3-Math.sqrt(5));
 const r=Math.sqrt(1-y*y);
 return new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);
});

/** Cut actual openings in the rendered shell, including its shadow pass. */
function perforate(material: THREE.Material) {
 material.onBeforeCompile=shader=>{
  shader.uniforms.holeDirections={value:holeDirections};
  shader.vertexShader='varying vec3 shellPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nshellPosition = position;');
  shader.fragmentShader=`varying vec3 shellPosition;\nuniform vec3 holeDirections[${HOLE_COUNT}];\n`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
   vec3 shellDirection = normalize(shellPosition);
   for (int i = 0; i < ${HOLE_COUNT}; i++) {
    if (dot(shellDirection, holeDirections[i]) > ${Math.cos(HOLE_ANGLE).toFixed(8)}) discard;
   }
  `);
 };
 material.customProgramCacheKey=()=> 'pickleball-perforated-shell-v1';
}

export function createPickleball() {
 const ball=new THREE.Group();ball.name='perforated-pickleball';
 const outside=new THREE.MeshStandardMaterial({color:'#DFFF32',emissive:'#DFFF32',emissiveIntensity:.12,roughness:.43,metalness:0});
 const inside=new THREE.MeshStandardMaterial({color:'#263b09',roughness:.8,side:THREE.BackSide});
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 for(const material of [outside,inside,depth])perforate(material);
 const geometry=new THREE.SphereGeometry(RADIUS,64,48);
 const shell=new THREE.Mesh(geometry,outside);shell.castShadow=true;shell.customDepthMaterial=depth;ball.add(shell);
 const lining=new THREE.Mesh(geometry,inside);lining.scale.setScalar((RADIUS-THICKNESS)/RADIUS);ball.add(lining);
 // Thin walls connect the outer and inner openings, so close views read as
 // molded hollow plastic rather than painted dots or a paper-thin sphere.
 const outerRadius=RADIUS*Math.sin(HOLE_ANGLE);
 const innerRadius=(RADIUS-THICKNESS)*Math.sin(HOLE_ANGLE);
 const wallGeometry=new THREE.CylinderGeometry(outerRadius,innerRadius,THICKNESS*Math.cos(HOLE_ANGLE),20,1,true);
 const wallMaterial=new THREE.MeshStandardMaterial({color:'#759512',roughness:.55,side:THREE.DoubleSide});
 const up=new THREE.Vector3(0,1,0);
 for(const direction of holeDirections){
  const wall=new THREE.Mesh(wallGeometry,wallMaterial);
  wall.position.copy(direction).multiplyScalar((RADIUS-THICKNESS/2)*Math.cos(HOLE_ANGLE));
  wall.quaternion.setFromUnitVectors(up,direction);ball.add(wall);
 }
 return ball;
}

/** Preserve the perforated shell and restore daylight materials on court changes. */
export function setPickleballGlow(ball:THREE.Group,enabled:boolean){
 const shell=ball.children[0] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
 shell.material.emissiveIntensity=enabled?2.4:.12;
}
