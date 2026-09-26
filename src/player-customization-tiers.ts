import type {APPEARANCE_OPTIONS} from './player-design';

// Explicit assignments keep tiers stable when new styles are added or reordered.
// This first pass organizes the picker only; subscription access is not enforced yet.
export const PREMIUM_APPEARANCE_OPTIONS:Partial<{
 [Key in keyof typeof APPEARANCE_OPTIONS]:readonly (typeof APPEARANCE_OPTIONS)[Key][number][]
}>={
 hairStyle:['bun','side-part','curls','mohawk','long','pigtails','twin-buns','side-braid','long-waves'],
 facialHair:['goatee','long-beard','chops'],
 expression:['angry','crying','confident'],
 hat:['beanie','bucket','crown','tiara','viking','cowboy','santa','sombrero'],
 top:['polo','hoodie','long-sleeve'],
 bottom:['pleated-skirt','pants'],
 glasses:['wraparound','cat-eye','hexagon','stars','flowers','hearts','diamonds','oversized'],
 outfit:['frog','dinosaur','lion','bear','butterfly','bee'],
 accessory:['watch','dinosaur-tail','cape'],
 paddleShape:['rectangular','circular','squarish-circles','squarish-lines','rounded-circles','rounded-lines'],
};
