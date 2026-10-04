
class MemoryStorage implements Storage {
 private values=new Map<string,string>();
 get length(){return this.values.size}
 clear(){this.values.clear()}
 getItem(key:string){return this.values.get(String(key))??null}
 key(index:number){return [...this.values.keys()][index]??null}
 removeItem(key:string){this.values.delete(String(key))}
 setItem(key:string,value:string){this.values.set(String(key),String(value))}
}

/** Once acquired, storage remains authoritative. A failed write must reach the caller. */
export function createSafeStorage(read:()=>Storage):{storage:Storage;persistent:boolean}{
 try{
  const storage=read();
  // Reading does not require spare quota. A full store must not hide existing saves.
  storage.getItem('__picklebash_storage_probe__');
  return {storage,persistent:true};
 }catch{return {storage:new MemoryStorage(),persistent:false}}
}

const local=createSafeStorage(()=>globalThis.localStorage);
const session=createSafeStorage(()=>globalThis.sessionStorage);
export const browserStorage=local.storage;
export const browserSessionStorage=session.storage;
export const browserStoragePersistent=local.persistent&&session.persistent;
