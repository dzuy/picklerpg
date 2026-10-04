/** Data URLs cost roughly two bytes per character in the conservative budget. */
export class BoundedImageCache {
 private entries=new Map<string,string>();private bytes=0;
 constructor(private maxBytes=2*1024*1024,private maxEntries=96){}
 get size(){return this.entries.size}
 has(key:string){return this.entries.has(key)}
 get(key:string){const value=this.entries.get(key);if(value!==undefined){this.entries.delete(key);this.entries.set(key,value);}return value;}
 set(key:string,value:string){
  const old=this.entries.get(key);if(old!==undefined){this.bytes-=2*(key.length+old.length);this.entries.delete(key);}
  const bytes=2*(key.length+value.length);if(bytes>this.maxBytes)return;
  this.entries.set(key,value);this.bytes+=bytes;
  while(this.bytes>this.maxBytes||this.entries.size>this.maxEntries){const first=this.entries.entries().next().value!;this.entries.delete(first[0]);this.bytes-=2*(first[0].length+first[1].length);}
 }
 clear(){this.entries.clear();this.bytes=0;}
}
