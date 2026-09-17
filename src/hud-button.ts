/** One shared blue frame for every court control. */
let sequence=0;
const symbols={
 close:'<path d="M23 23l18 18M41 23L23 41"/>',
 replay:'<path d="M21 28a13 13 0 1 1-1 12M21 19v10h10"/>',
 reactions:'<path d="M21 20h22a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2H31l-10 7v-7a2 2 0 0 1-2-2V22a2 2 0 0 1 2-2Z"/><path d="M25 27h14M25 34h9"/>',
 settings:'<path d="m28 18 1-4h6l1 4 4 2 4-1 3 5-3 3v5l3 3-3 5-4-1-4 2-1 5h-6l-1-5-4-2-4 1-3-5 3-3v-5l-3-3 3-5 4 1Z" transform="translate(0 2)"/><circle cx="32" cy="32" r="6"/>'
};
export function hudButtonIcon(kind:keyof typeof symbols){
 const id=`hud-button-${++sequence}`;
 return `<svg class="hud-button-art" aria-hidden="true" viewBox="0 0 64 64"><defs><radialGradient id="${id}-face" cx="38%" cy="25%" r="78%"><stop stop-color="#1269a9"/><stop offset=".55" stop-color="#073469"/><stop offset="1" stop-color="#04122e"/></radialGradient><filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><circle cx="32" cy="32" r="27" fill="none" stroke="#00dfff" stroke-width="4" filter="url(#${id}-glow)"/><circle cx="32" cy="32" r="27" fill="url(#${id}-face)" stroke="#69f7ff" stroke-width="1.8"/><circle cx="32" cy="32" r="23.5" fill="none" stroke="#068adc" stroke-width="1.5"/><path d="M14 22a22 22 0 0 1 32-9" fill="none" stroke="#b1faff" stroke-opacity=".55" stroke-linecap="round"/><g class="hud-button-symbol" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${symbols[kind]}</g></svg>`;
}
