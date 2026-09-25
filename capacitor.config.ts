import type {CapacitorConfig} from '@capacitor/cli';

const config:CapacitorConfig={
 appId:'com.picklebash.app',
 appName:'PickleBash',
 webDir:'dist',
 ios:{contentInset:'never'},
 plugins:{PushNotifications:{presentationOptions:['badge','sound','banner','list']}},
};

export default config;
