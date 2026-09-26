/** Locations contain presentation only. All play uses the shared COURT model. */
export type CourtLocation=typeof COURT_LOCATIONS[number]['id'];
export const COURT_LOCATIONS=[
 {id:'forest',name:'The Forest',description:'Shaded courts. Clean rallies.',image:'/images/forest-court.png'},
 {id:'venice',name:'Venice Sunset',description:'Los Angeles · Palms. Pacific. Pink skies.',image:'/images/venice-sunset.svg'},
 {id:'arizona',name:'Arizona Desert',description:'Red rock. Saguaros. Wide-open skies.',image:'/images/arizona-desert.svg'},
 {id:'city',name:'The City',description:'Rooftop rallies above the skyline.',image:'/images/city-court.svg'},
 {id:'glowball',name:'Glowball',description:'Lights out. Lines on. Glow-in-the-dark pickleball.',image:'/images/glowball-court.svg'},
 {id:'jungle',name:'The Jungle',description:'Costa Rica · Tropical trees and wild company.',image:'/images/jungle-court.svg'},
] as const;
export function isCourtLocation(value:unknown):value is CourtLocation{return COURT_LOCATIONS.some(c=>c.id===value)}
export function courtName(value:CourtLocation='forest'){return value==='venice'?'The Beach':COURT_LOCATIONS.find(c=>c.id===value)!.name}
export const LOCATION_PALETTES={
 city:{ground:'#26374f',apron:'#47556f',border:'#263b59',court:'#287e9c',kitchen:'#62c3c7',sky:'#8d91b0'},
 glowball:{ground:'#080d1c',apron:'#141526',border:'#653d96',court:'#142737',kitchen:'#2b1d42',sky:'#050712'},
 jungle:{ground:'#315b39',apron:'#927854',border:'#254d40',court:'#317975',kitchen:'#91b990',sky:'#8eaea1'},
 arizona:{ground:'#dbb183',apron:'#c5805d',border:'#795247',court:'#785f80',kitchen:'#b38f9e',sky:'#aac7d1'},
 forest:{ground:'#76A64B',apron:'#178668',border:'#07505A',court:'#08AABB',kitchen:'#83D9C9',sky:'#87b6a1'},
 venice:{ground:'#eac29a',apron:'#cf6384',border:'#713f70',court:'#157f92',kitchen:'#51b9b4',sky:'#eab2aa'},
} as const;
