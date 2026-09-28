/** The product event contract. No names, messages, emails, tokens, or free text. */
export type GameMode='solo'|'local'|'multiplayer';
export type MatchProperties={match_id:string;game_mode:GameMode;opponent_id?:string;match_number_between_players?:number;rematch_of_match_id?:string};
export type RematchProperties={original_match_id:string;opponent_id?:string;rematch_match_id?:string;manual_vs_auto?:'manual'|'automatic';seconds_remaining_when_requested?:number};
export type InviteProperties={invite_id:string;inviter_id?:string;resulting_match_id?:string;invite_method?:'link_copy'|'native_share'|'in_app';source?:string};
export interface AnalyticsEvents {
 app_opened:{source:'launch'|'foreground'};
 onboarding_started:{source:string}; onboarding_completed:{source:string};
 account_created:{signup_source:string}; player_created:{player_id:string;source:string};
 invite_created:InviteProperties; invite_sent:InviteProperties; invite_opened:InviteProperties; invite_accepted:InviteProperties;
 invited_player_activated:InviteProperties; invited_player_first_match_completed:InviteProperties;
 match_created:MatchProperties; match_started:MatchProperties;
 match_completed:MatchProperties&{won:boolean;home_score:number;away_score:number;duration_seconds?:number;number_of_turns?:number;player_match_number?:number};
 match_abandoned:MatchProperties;
 turn_started:MatchProperties&{turn_number:number};
 shot_selected:MatchProperties&{turn_number:number;shot_type:string;home_score:number;away_score:number};
 turn_completed:MatchProperties&{turn_number:number};
 rematch_prompt_shown:RematchProperties&{countdown_enabled:boolean};
 rematch_manual_requested:RematchProperties;rematch_auto_requested:RematchProperties;rematch_request_received:RematchProperties;
 rematch_accepted:RematchProperties;rematch_declined:RematchProperties;rematch_started:RematchProperties;rematch_completed:RematchProperties;
 xp_earned:{source:string;final_xp:number;base_xp:number;multiplier:number;lifetime_xp:number;current_skill_budget:number};
 skill_point_earned:{new_skill_budget:number;lifetime_xp:number;points_earned:number};
 skill_point_allocated:{player_id:string;points_used:number;source:string};
 skill_points_reallocated:{player_id:string;points_used:number;source:string};
 plus_paywall_viewed:{feature:string;source:string};plus_purchase_started:{product_id:string;source:string};
 plus_purchase_completed:{product_id:string;transaction_id:string};plus_purchase_restored:{product_id:string;transaction_id:string};
 plus_entitlement_changed:{feature:string;enabled:boolean;source:string};
 cosmetic_viewed:{category:string;item_id:string;tier:'standard'|'premium'};
 cosmetic_equipped:{category:string;item_id:string;tier:'standard'|'premium'};
 cosmetic_purchase_started:{item_id:string};cosmetic_purchase_completed:{item_id:string;transaction_id:string};
}
export type EventName=keyof AnalyticsEvents;
export const FLAG_DEFAULTS={rematch_auto_countdown:false,decision_quiz:false,xp_progression:true,advanced_stats:false,plus_features:false,experimental_gameplay:false} as const;
export type FlagName=keyof typeof FLAG_DEFAULTS;
export type Environment='development'|'staging'|'production';
export interface UserProperties {account_created_at?:string;is_guest?:boolean;player_count?:number;games_completed?:number;signup_source?:string;has_full_game_analysis?:boolean}
/** Required runtime keys supplement TypeScript at storage/network boundaries. */
export const EVENT_REQUIRED={
 app_opened:['source'],onboarding_started:['source'],onboarding_completed:['source'],account_created:['signup_source'],player_created:['player_id','source'],
 invite_created:['invite_id'],invite_sent:['invite_id'],invite_opened:['invite_id'],invite_accepted:['invite_id'],invited_player_activated:['invite_id'],invited_player_first_match_completed:['invite_id'],
 match_created:['match_id','game_mode'],match_started:['match_id','game_mode'],match_completed:['match_id','game_mode','won','home_score','away_score'],match_abandoned:['match_id','game_mode'],
 turn_started:['match_id','game_mode','turn_number'],shot_selected:['match_id','game_mode','turn_number','shot_type','home_score','away_score'],turn_completed:['match_id','game_mode','turn_number'],
 rematch_prompt_shown:['original_match_id','countdown_enabled'],rematch_manual_requested:['original_match_id'],rematch_auto_requested:['original_match_id'],rematch_request_received:['original_match_id'],rematch_accepted:['original_match_id'],rematch_declined:['original_match_id'],rematch_started:['original_match_id','rematch_match_id'],rematch_completed:['original_match_id','rematch_match_id'],
 xp_earned:['source','final_xp','base_xp','multiplier','lifetime_xp','current_skill_budget'],skill_point_earned:['new_skill_budget','lifetime_xp','points_earned'],skill_point_allocated:['player_id','points_used','source'],skill_points_reallocated:['player_id','points_used','source'],
 plus_paywall_viewed:['feature','source'],plus_purchase_started:['product_id','source'],plus_purchase_completed:['product_id','transaction_id'],plus_purchase_restored:['product_id','transaction_id'],plus_entitlement_changed:['feature','enabled','source'],
 cosmetic_viewed:['category','item_id','tier'],cosmetic_equipped:['category','item_id','tier'],cosmetic_purchase_started:['item_id'],cosmetic_purchase_completed:['item_id','transaction_id']
} as const satisfies {[E in EventName]:readonly (keyof AnalyticsEvents[E])[]};
export function validProductEvent(event:string,properties:Record<string,unknown>):event is EventName{
 if(!Object.hasOwn(EVENT_REQUIRED,event))return false;
 return EVENT_REQUIRED[event as EventName].every(key=>{const value=properties[key];return typeof value==='string'?value.length>0&&value.length<=150:typeof value==='number'?Number.isFinite(value):typeof value==='boolean';});
}
