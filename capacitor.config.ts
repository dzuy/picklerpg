import type {CapacitorConfig} from '@capacitor/cli';

const config:CapacitorConfig={
 appId:'com.picklebash.app',
 appName:'PickleBash',
 webDir:'dist',
 ios:{contentInset:'never'},
 // Foreground play stays quiet; iOS still presents alerts when the app is backgrounded.
 plugins:{PushNotifications:{presentationOptions:['badge']}},
};

export default config;
