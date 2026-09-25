import {Capacitor} from '@capacitor/core';

// The installed app serves bundled pages locally, while online APIs and share links stay on the web host.
export const publicOrigin=()=>Capacitor.isNativePlatform()?'https://picklebash.app':location.origin;
export const apiUrl=(path:string)=>Capacitor.isNativePlatform()?new URL(path,publicOrigin()).href:path;
