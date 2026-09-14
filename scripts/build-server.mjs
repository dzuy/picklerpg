import {build} from 'esbuild';
await build({entryPoints:['server/multiplayer/entry.ts'],outfile:'dist-server/multiplayer.mjs',bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',sourcemap:true});
