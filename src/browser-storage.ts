export const STORAGE_UNAVAILABLE_MESSAGE='Browser storage is blocked. You can play, but progress and sign-in will not persist after closing this tab.';

class MemoryStorage implements Storage {
 private values=new Map<string,string>();
 get length(){return this.values.size}
 clear(){this.values.clear()}
 getItem(key:string){return this.values.get(String(key))??null}
 key(index:number){return [...this.values.keys()][index]??null}
 removeItem(key:string){this.values.delete(String(key))}
 setItem(key:string,value:string){this.values.set(String(key),String(value))}
}

class FailoverStorage implements Storage {
 private failed=false;
 private readonly fallback=new MemoryStorage();
 constructor(private readonly primary:Storage){}
 get length(){return this.read(storage=>storage.length)}
 clear(){this.write(storage=>storage.clear())}
 getItem(key:string){return this.read(storage=>storage.getItem(key))}
 key(index:number){return this.read(storage=>storage.key(index))}
 removeItem(key:string){this.write(storage=>storage.removeItem(key))}
 setItem(key:string,value:string){this.write(storage=>storage.setItem(key,value))}
 private read<T>(operation:(storage:Storage)=>T):T{
  if(!this.failed)try{return operation(this.primary)}catch{this.failed=true}
  return operation(this.fallback);
 }
 private write(operation:(storage:Storage)=>void){
  if(!this.failed)try{operation(this.primary);return}catch{this.failed=true}
  operation(this.fallback);
 }
}

export function createSafeStorage(read:()=>Storage):{storage:Storage;persistent:boolean}{
 try{
  const storage=read(),probe='__picklebash_storage_probe__',previous=storage.getItem(probe);
  storage.setItem(probe,'1');
  if(previous===null)storage.removeItem(probe);else storage.setItem(probe,previous);
  return {storage:new FailoverStorage(storage),persistent:true};
 }catch{return {storage:new MemoryStorage(),persistent:false}}
}

const local=createSafeStorage(()=>globalThis.localStorage);
const session=createSafeStorage(()=>globalThis.sessionStorage);
export const browserStorage=local.storage;
export const browserSessionStorage=session.storage;
export const browserStoragePersistent=local.persistent&&session.persistent;
