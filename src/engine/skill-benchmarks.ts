/** Game-design benchmarks v1. Tune against playtests; not measured DUPR statistics.
 * Spread is an ordinary lateral/depth error bound in metres at a comfortable contact.
 * Lift error is independent: a strong player need not miss the net just because
 * the intended ball has a low arc. Pressure adds error without changing intent. */
export const SKILL_BENCHMARKS=[
 {skill:0,level:2,spread:1.5,lift:.5,mishit:.12,pressure:.9},
 {skill:40,level:3,spread:1.05,lift:.28,mishit:.07,pressure:.7},
 {skill:60,level:3.5,spread:.7,lift:.18,mishit:.045,pressure:.55},
 {skill:70,level:4,spread:.45,lift:.11,mishit:.025,pressure:.4},
 {skill:80,level:4.5,spread:.28,lift:.065,mishit:.015,pressure:.28},
 {skill:90,level:5,spread:.16,lift:.035,mishit:.008,pressure:.18},
 {skill:100,level:5.5,spread:.09,lift:.02,mishit:.004,pressure:.12}
] as const;
export function skillBenchmark(skill:number){
 if(!Number.isFinite(skill)||skill<0||skill>100)throw new Error('Skill must be between zero and 100.');
 const upper=SKILL_BENCHMARKS.findIndex(b=>b.skill>=skill);
 const a=SKILL_BENCHMARKS[Math.max(0,upper-1)],b=SKILL_BENCHMARKS[upper];
 const t=a.skill===b.skill?0:(skill-a.skill)/(b.skill-a.skill);
 const mix=(key:'level'|'spread'|'lift'|'mishit'|'pressure')=>a[key]+(b[key]-a[key])*t;
 return {level:mix('level'),spread:mix('spread'),lift:mix('lift'),mishit:mix('mishit'),pressure:mix('pressure')};
}
