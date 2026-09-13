/** The shell is life-sized nearby, with a five-pixel diameter floor at distance. */
export function ballDisplayScale(distance:number,viewportHeight:number,fovDegrees:number,zoom:number){
 const pixelsPerMetre=viewportHeight*zoom/(2*Math.tan(fovDegrees*Math.PI/360)*Math.max(.1,distance));
 return Math.max(.037/.092,Math.min(1.6,2.5/(pixelsPerMetre*.092)));
}
export function bouncePulse(age:number){return age>=0&&age<.45?{radius:.12+age*.65,opacity:(1-age/.45)*.8}:null}
export function cameraBlend(dt:number,reducedMotion:boolean){return reducedMotion?0:1-Math.exp(-2.1*Math.max(0,Math.min(.1,dt)))}

/** At shallow angles, anchor the court above the dock instead of exposing empty foreground. */
export function courtOverlayOffset(width:number,height:number,overlay:number,courtBottom:number,elevation:number){
 if(overlay<=0)return 0;
 const standard=Math.min(overlay*(width<760?.5:.6),height*.26);
 const t=Math.max(0,Math.min(1,(elevation-.18)/.42));
 const overhead=t*t*(3-2*t);
 const bottomAligned=Math.min(standard,courtBottom-(height-overlay-48));
 return bottomAligned+(standard-bottomAligned)*overhead;
}
