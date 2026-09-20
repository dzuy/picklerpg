import type {PublicMatch} from './protocol';

/** A turn indicator, hidden during playback, pauses and completed/pending games. */
export function thinkingOpponent(state:PublicMatch|null,obscured=false){
 if(!state||obscured||state.status!=='active'||state.friendState==='pending'||state.friendState==='cancelled'||!state.currentTeam||state.currentTeam===state.viewerTeam)return null;
 const player=state.display.players.find(p=>p.id===state.nextHitter);
 return player?.team===state.currentTeam?player.id:null;
}
