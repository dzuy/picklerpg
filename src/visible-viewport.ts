/** Visible screen bounds in this document's layout coordinates, including game iframes. */
export function visibleViewport(win:Window=window):{left:number;top:number;width:number;height:number}{
 const viewport=win.visualViewport;
 const local={left:viewport?.offsetLeft??0,top:viewport?.offsetTop??0,width:viewport?.width??win.innerWidth,height:viewport?.height??win.innerHeight};
 try{
  if(win.parent!==win&&win.frameElement){
   const parent=visibleViewport(win.parent),frame=win.frameElement.getBoundingClientRect();
   const left=Math.max(0,parent.left-frame.left),top=Math.max(0,parent.top-frame.top);
   return {left,top,width:Math.max(0,Math.min(frame.width,parent.left+parent.width-frame.left)-left),height:Math.max(0,Math.min(frame.height,parent.top+parent.height-frame.top)-top)};
  }
 }catch{/* Cross-origin embeds can only expose their own viewport. */}
 return local;
}
