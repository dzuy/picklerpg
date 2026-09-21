/** User-approved meanings. Add corrections here with contrast examples and geometry tests. */
export const shotLanguageExamples=[
 {phrase:'drive down the line',target:'line',aim:'sideline',pace:'medium'},
 {phrase:"drive down Luna's line",targetName:'Luna',aim:'sideline',pace:'medium'},
 {phrase:'drive hard down Luna’s line',targetName:'Luna',aim:'sideline',pace:'fast'},
 {phrase:'drive deep to Luna',targetName:'Luna',aim:'behind',pace:'medium'},
 {phrase:'drive hard at Luna',targetName:'Luna',aim:'body',pace:'fast'},
 {phrase:'drive down the middle',target:'middle',aim:'space',pace:'medium'},
];
export const shotLanguageGuidance=`Approved targeting vocabulary:
"Erne" means shot erne: an airborne volley struck from outside the kitchen sideline. Preserve the requested target. The engine handles whether the contact supports it.
"Down the line", "along the sideline", and "down [player name]'s line" mean aim sideline: land near the court edge, not in the player's central lane or at their body. For a named player keep their actual roster id as target; the engine picks the sideline on that player's current side. Without a named player or explicit left/right side, use target line and aim sideline (the hitter's contact side). Explicit left/right sideline uses target far-left/far-right and aim sideline. Placement words never imply extra pace. Respect negation; "not down the line, down the middle" means middle/space. Resolve names only from the current roster; example names below do not establish roster membership. These are examples of meaning, not a restricted vocabulary:
${JSON.stringify(shotLanguageExamples)}`;
