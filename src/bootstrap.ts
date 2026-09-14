if(new URLSearchParams(location.search).get('multiplayer')==='1')await import('./multiplayer/remote-main');
else await import('./main');
export {};
