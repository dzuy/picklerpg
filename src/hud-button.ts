/** Shared HUD symbols; utility controls are white icons without a container. */
const symbols={
 close:'<path d="M23 23l18 18M41 23L23 41"/>',
 replay:'<path d="M21 28a13 13 0 1 1-1 12M21 19v10h10"/>',
 reactions:'<path d="M21 20h22a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2H31l-10 7v-7a2 2 0 0 1-2-2V22a2 2 0 0 1 2-2Z"/><path d="M25 27h14M25 34h9"/>',
 settings:'<path d="m28 18 1-4h6l1 4 4 2 4-1 3 5-3 3v5l3 3-3 5-4-1-4 2-1 5h-6l-1-5-4-2-4 1-3-5 3-3v-5l-3-3 3-5 4 1Z" transform="translate(0 2)"/><circle cx="32" cy="32" r="6"/>'
};
export function hudButtonIcon(kind:keyof typeof symbols){
 return `<svg class="hud-button-art${kind==='close'?'':' hud-button-art--bare'}" aria-hidden="true" viewBox="0 0 64 64"><circle class="hud-button-face" cx="32" cy="32" r="28"/><g class="hud-button-symbol" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${symbols[kind]}</g></svg>`;
}
