import {productProperties} from './privacy';
import {FLAG_DEFAULTS,validProductEvent,type AnalyticsEvents,type EventName,type FlagName,type UserProperties} from './events';
export interface AnalyticsAdapter {
 track(event:EventName,properties:Record<string,unknown>):void;
 identify(id:string,properties:UserProperties):void;reset():void;setUserProperties(properties:UserProperties):void;
 flag(key:FlagName):boolean|string|undefined;
}
type ReceiptStorage=Pick<Storage,'getItem'|'setItem'>;
const RECEIPTS='picklebash-analytics-receipts-v1';
/** All application calls are synchronous, bounded, and fail open for gameplay. */
export class AnalyticsController {
 private adapter:AnalyticsAdapter|null=null;private owner:string|null=null;private seen=new Set<string>();
 private pending:Array<{event:EventName;properties:Record<string,unknown>;owner:string|null}>=[];
 private properties:UserProperties={};private lastFlags=new Map<FlagName,boolean|string>();
 constructor(private debug=false,private storage?:ReceiptStorage){try{const keys=JSON.parse(storage?.getItem(RECEIPTS)??'[]');if(Array.isArray(keys))this.seen=new Set(keys.filter(k=>typeof k==='string').slice(-2000));}catch{}}
 connect(adapter:AnalyticsAdapter){
  this.adapter=adapter;
  try{if(this.owner)adapter.identify(this.owner,this.properties);for(const event of this.pending)if(event.owner===null||event.owner===this.owner)adapter.track(event.event,event.properties);}catch{}
  this.pending=[];
 }
 track<E extends EventName>(event:E,properties:AnalyticsEvents[E],once?:string){
  try{if(!validProductEvent(event,properties))return;const key=once?`${this.owner??'anonymous'}:${event}:${once}`:null;if(key&&this.seen.has(key))return;
   if(key){this.seen.add(key);if(this.seen.size>2000)this.seen.delete(this.seen.values().next().value!);try{this.storage?.setItem(RECEIPTS,JSON.stringify([...this.seen]));}catch{}}
   const safe=productProperties(properties);if(this.debug)console.debug('[analytics]',event,safe);
   if(this.adapter)this.adapter.track(event,safe);else{this.pending.push({event,properties:safe,owner:this.owner});if(this.pending.length>100)this.pending.shift();}
  }catch{/* Telemetry cannot affect game state. */}
 }
 identify(id:string,properties:UserProperties={}){try{if(this.owner&&this.owner!==id)this.reset();this.owner=id;this.properties=properties;this.adapter?.identify(id,properties);}catch{}}
 reset(){this.owner=null;this.properties={};this.pending=[];try{this.adapter?.reset();}catch{}}
 setUserProperties(properties:UserProperties){try{this.properties={...this.properties,...properties};this.adapter?.setUserProperties(properties);}catch{}}
 getVariant(key:FlagName,fallback:boolean|string=FLAG_DEFAULTS[key]):boolean|string{try{const value=this.adapter?.flag(key);if(this.debug&&this.lastFlags.get(key)!==(value??fallback)){console.debug('[flags]',key,value??fallback);this.lastFlags.set(key,value??fallback);}return value??fallback;}catch{return fallback;}}
 isEnabled(key:FlagName){return this.getVariant(key)===true;}
}
