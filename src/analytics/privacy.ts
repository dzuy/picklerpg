/** Strip URL attribution too: challenge URLs and auth fragments are capabilities. */
export function sanitizeProperties(properties:Record<string,any>){
 for(const key of Object.keys(properties)){
  if(/url|referrer|pathname|search|hash|email|name|token|password|description|command/i.test(key))delete properties[key];
 }
 return properties;
}
const allowed=new Set('match_id game_mode opponent_id opponent_is_bot match_number_between_players rematch_of_match_id player_match_number won home_score away_score duration_seconds number_of_turns result_authority turn_number shot_type original_match_id rematch_match_id manual_vs_auto seconds_remaining_when_requested countdown_enabled invite_id inviter_id resulting_match_id invite_method source signup_source attribution_scope player_id final_xp base_xp multiplier lifetime_xp current_skill_budget new_skill_budget points_earned points_used feature enabled product_id transaction_id category item_id tier'.split(' '));
/** Runtime allowlist also protects the SDK from accidental future DB-view additions. */
export function productProperties(properties:Record<string,unknown>){
 return Object.fromEntries(Object.entries(properties).filter(([key,value])=>allowed.has(key)&&(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&value.length<=150)));
}
