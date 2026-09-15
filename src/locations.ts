/** Locations contain presentation only. All play uses the shared COURT model. */
export type CourtLocation='forest'|'venice'|'arizona';
export const COURT_LOCATIONS=[
 {id:'forest',name:'The Forest',description:'Shaded courts. Clean rallies.',image:'/assets/picklebash-select/locations/forest.jpg'},
 {id:'venice',name:'Venice Sunset',description:'Los Angeles · Palms. Pacific. Pink skies.',image:'/images/venice-sunset.svg'},
 {id:'arizona',name:'Arizona Desert',description:'Red rock. Saguaros. Wide-open skies.',image:'/images/arizona-desert.svg'},
] as const;
export const LOCATION_PALETTES={
 arizona:{ground:'#dbb183',apron:'#c5805d',border:'#795247',court:'#785f80',kitchen:'#b38f9e',sky:'#aac7d1'},
 forest:{ground:'#76A64B',apron:'#178668',border:'#07505A',court:'#08AABB',kitchen:'#83D9C9',sky:'#87b6a1'},
 venice:{ground:'#eac29a',apron:'#cf6384',border:'#713f70',court:'#157f92',kitchen:'#51b9b4',sky:'#eab2aa'},
} as const;
