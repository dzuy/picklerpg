import {cleanTrashTalk} from './multiplayer/trash-talk';
// Public identity text keeps its existing policy independently of private chat.
const profanity=/\b(?:motherfuck(?:er|ers|ing)?|fuck(?:s|ed|er|ers|ing)?|shit(?:s|ty|ting|head)?|bullshit|bitch(?:es|y|ing)?|ass(?:hole|holes)?|bastard(?:s)?|damn(?:ed|it)?|crap|piss(?:ed|ing)?|dick(?:s|head)?|cock(?:s)?|cunt(?:s)?|prick(?:s)?|wanker(?:s)?|twat(?:s)?|fag(?:got|gots|s)?|nigg(?:er|ers|a|as))\b/gi;
export function cleanPublicPlayerText(input:string){return cleanTrashTalk(input).replace(profanity,'!@#$%');}
