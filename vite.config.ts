import {defineConfig} from 'vite';
export default defineConfig({server:{proxy:{'/api/opponent':'http://127.0.0.1:5174','/api/command':'http://127.0.0.1:5174'}}});
