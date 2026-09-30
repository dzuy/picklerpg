import {browserStorage} from '../browser-storage';
import {sanitizeProperties} from './privacy';
import {Capacitor} from '@capacitor/core';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import {AnalyticsController} from './core';
import type {FlagName} from './events';
const env=import.meta.env??{};
export const Analytics=new AnalyticsController(env.DEV&&env.VITE_ANALYTICS_DEBUG==='true',browserStorage);
export const FeatureFlags={isEnabled:(key:FlagName)=>Analytics.isEnabled(key),getVariant:(key:FlagName,fallback?:boolean|string)=>Analytics.getVariant(key,fallback)};
if(env.DEV){
 let overrides:Record<string,boolean|string>={};try{overrides=JSON.parse(env.VITE_FEATURE_FLAG_OVERRIDES??'{}');}catch{}
 Analytics.connect({track(){},identify(){},reset(){},setUserProperties(){},flag:key=>{const value=overrides[key];return typeof value==='boolean'||typeof value==='string'?value:undefined;}});
}
let bound=false;
/** Bind before initialization: INITIAL_SESSION is the authority, never a stale persisted PostHog ID. */
export function bindAnalyticsIdentity(client:SupabaseClient){
 if(bound||location.pathname.startsWith('/admin/'))return;bound=true;
 let user:User|null=null,ready=false,apply=()=>{if(user)Analytics.identify(user.id,{is_guest:!!user.is_anonymous});else Analytics.reset();};
 client.auth.onAuthStateChange((_event,session)=>{user=session?.user??null;ready=true;apply();});
 const environment=env.VITE_ANALYTICS_ENVIRONMENT??'development';
 if(env.VITE_POSTHOG_ENABLED!=='true'||!env.VITE_POSTHOG_KEY||!['production','staging'].includes(environment))return;
 // Local builds cannot send to a live project even if production credentials were copied.
 if(env.DEV||(!Capacitor.isNativePlatform()&&['localhost','127.0.0.1'].includes(location.hostname)))return;
 void import('posthog-js').then(({default:posthog})=>{
  let identity:string|null=null,flagsReady=false,flagsLoadedAt=0,opened=false;
  posthog.init(env.VITE_POSTHOG_KEY,{
   api_host:env.VITE_POSTHOG_HOST??'https://us.i.posthog.com',
   autocapture:false,capture_pageview:false,capture_pageleave:false,capture_performance:false,
   disable_session_recording:true,enable_recording_console_log:false,disable_surveys:true,
   person_profiles:'identified_only',persistence:'localStorage',
   advanced_disable_decide:false,feature_flag_request_timeout_ms:2000,
   session_recording:{sampleRate:0.1,maskAllElementAttributes:true,maskAllInputs:true,maskTextSelector:'*',blockSelector:'input,textarea,[contenteditable],.trash-talk,.friend-share-dialog,.account-safety-dialog',captureCanvas:{recordCanvas:false},recordHeaders:false,recordBody:false,maskCapturedNetworkRequestFn:()=>null,attributeFilter:['class','style','role','aria-hidden','disabled']},
   sanitize_properties:sanitizeProperties,
   loaded(){
    // No automatic events are allowed before the Supabase identity has been resolved.
    apply=()=>{try{
     if(!ready)return;
     const next=user?.id??null;
     if(identity!==next){flagsReady=false;posthog.stopSessionRecording();}
     if(!opened&&next!==posthog.get_distinct_id())posthog.reset(true);
     identity=next;
     if(user)Analytics.identify(user.id,{is_guest:!!user.is_anonymous,account_created_at:user.created_at,has_full_game_analysis:user.app_metadata?.full_game_analysis===true});else Analytics.reset();
     posthog.register({environment,platform:Capacitor.getPlatform(),app_version:env.VITE_APP_VERSION??'0.1.0',event_source:'client'});
     Analytics.connect({track:(event,properties)=>posthog.capture(event,{...properties,environment,platform:Capacitor.getPlatform(),app_version:env.VITE_APP_VERSION??'0.1.0',event_source:'client'}),identify:(id,properties)=>posthog.identify(id,properties),reset:()=>{flagsReady=false;posthog.stopSessionRecording();posthog.reset(true);},setUserProperties:properties=>posthog.setPersonProperties(properties),flag:key=>flagsReady&&navigator.onLine&&Date.now()-flagsLoadedAt<60000?posthog.getFeatureFlag(key):undefined});
     if(!opened){opened=true;Analytics.track('app_opened',{source:'launch'});document.addEventListener('visibilitychange',()=>{if(!document.hidden)Analytics.track('app_opened',{source:'foreground'});});}
     if(env.VITE_POSTHOG_REPLAY_ENABLED==='true'&&user&&!location.pathname.startsWith('/challenge/')&&!/(token|code=|guestChallenge)/i.test(location.search+location.hash))posthog.startSessionRecording();
    }catch{/* Analytics must not interrupt auth listeners. */}};
    posthog.onFeatureFlags((_keys,_values,context)=>{flagsReady=!context?.errorsLoading;flagsLoadedAt=Date.now();});
    apply();
    const refresh=()=>{try{if(navigator.onLine)posthog.reloadFeatureFlags();}catch{flagsReady=false;}};setInterval(refresh,45000);window.addEventListener('online',refresh);
   }
  });
 }).catch(()=>{});
}
