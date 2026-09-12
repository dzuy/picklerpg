/** World units are metres. +X is screen-right; +Z is the user's end. */
export const FT = 0.3048;
export const COURT = Object.freeze({ width:20*FT, length:44*FT, kitchen:7*FT, line:2*.0254, netCenter:34*.0254, netSideline:36*.0254, netWidth:22*FT });
export type Vec3 = {x:number; y:number; z:number};
export type PlayerId = 'you'|'partner'|'opponent-left'|'opponent-right';
export const SHOT_TYPES = ['serve','return','drive','block','overhead','drop','dink','volley','reset','lob','counter'] as const;
export type ShotType = typeof SHOT_TYPES[number];
export const TARGET_ZONES = ['middle','crosscourt','line','wide','open-court'] as const;
export const TARGET_DEPTHS = ['kitchen','transition','deep'] as const;
export const PLAYER_AIMS = ['body','feet','backhand-side'] as const;
export const PACES = ['soft','medium','fast'] as const;
export const SHAPES = ['arc','flat','descending'] as const;
export const TACTICS = ['pressure','advance','neutralize','finish','sustain'] as const;
export const INPUT_SOURCES = ['menu','script','text','voice','ai'] as const;
export type ShotTarget =
 | {kind:'zone'; zone:typeof TARGET_ZONES[number]; depth:typeof TARGET_DEPTHS[number]}
 | {kind:'player'; playerId:PlayerId; aim:typeof PLAYER_AIMS[number]};
export interface ShotIntent {
 schemaVersion:1; actor:PlayerId; type:ShotType; target:ShotTarget;
 pace:typeof PACES[number]; shape:typeof SHAPES[number]; intendedNetClearance:number;
 tacticalIntent:typeof TACTICS[number]; aggression:number; source:typeof INPUT_SOURCES[number];
}
export const SKILLS = ['serve','return','drive','drop','dink','reset','volley','counter','overhead','movement','hands'] as const;
export type PlayerSkills = Record<typeof SKILLS[number],number>;
export interface Tendencies { aggression:number; middlePreference:number; kitchenApproach:number }
export interface PlayerState {
 id:PlayerId; position:Vec3; team:Team; handedness:'right'|'left';
 /** Radians about +Y: 0 faces -Z, PI faces +Z. */
 facing:number; skills:PlayerSkills; tendencies:Tendencies;
}
export interface BallState { position:Vec3; velocity:Vec3 }
export type RallyEvent =
 | {type:'rally-start'; time:number}
 | {type:'contact'; time:number; shotIndex:number; hitter:PlayerId; position:Vec3; incomingVelocity:Vec3}
 | {type:'shot'; time:number; shotIndex:number; intent:ShotIntent; contact:Vec3}
 | {type:'bounce'; time:number; shotIndex:number; position:Vec3}
 | {type:'point-end'; time:number; result:PointResult};
export interface FlightLeg { from:Vec3; to:Vec3; duration:number; arc:number; bounceAtEnd?:boolean }
export interface RallyShot { feedback?:{skill:number;quality:number;difficulty:string[];deviation:number;mishit:boolean};recommendation?:string; resolution?: {receiver:PlayerId|null; bounced:boolean; movementZ?:number; result?:PointResult}; aimPoint:Vec3; intent:ShotIntent; title:string; description:string; cue:string; actor:PlayerId; contact:Vec3; legs:FlightLeg[]; positions:Record<PlayerId,Vec3> }

export type Team = 'home' | 'away';
/** Tactical stage is independent of whether playback is paused or in flight. */
export type RallyStage = 'serve' | 'return' | 'third' | 'fourth' | 'transition' | 'kitchen-exchange' | 'attack' | 'counter' | 'reset' | 'point-end';
export interface PointResult { winner:Team; reason:'body-hit'|'winner'|'net'|'out'|'double-bounce'|'failed-return'|'unreturned-attack' }
export interface Contact { options:RallyShot[] }
export interface RallySetup { players:PlayerState[]; contact:Contact }
export type ContactOutcome = {kind:'contact'; contact:Contact} | {kind:'point-end'; result:PointResult};
export interface GameState {
 schemaVersion:2; simulationTime:number;
 phase:'decision'|'flight'|'complete'; stage:RallyStage; shotIndex:number;
 legIndex:number; elapsed:number; ball:BallState; players:PlayerState[];
 shotHistory:ShotIntent[]; rallyHistory:RallyEvent[]; bounces:number; score:Record<Team,number>; paused:boolean;
 currentHitter:PlayerId|null; possession:Team|null; result:PointResult|null;
}
/** A scenario or future execution/AI adapter supplies contacts, not playback transitions.
 * Snapshots are isolated copies. The provider cannot directly mutate engine state. */
export interface RallyProvider {
 shouldAutoPlay?(shot:RallyShot, state:Readonly<GameState>):boolean;
 setup():RallySetup;
 next(state:Readonly<GameState>, completedShot:Readonly<RallyShot>):ContactOutcome;
}
