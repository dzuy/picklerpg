/** Shared contract for the internal theme editor and its development-only file API. */
export const EDITABLE_COLORS=['primary','primary-hover','lime','pink','cyan','mint','teal','cream','white','text-secondary','surface-inset','border','focus'] as const;
export type ThemeColor=typeof EDITABLE_COLORS[number];
export type ThemePalette=Record<ThemeColor,string>;
export interface SavedStyle {id:string;name:string;colors:ThemePalette;updatedAt:string}
export interface StyleLibrary {version:1;activeId:string|null;styles:SavedStyle[]}
export function validatePalette(value:unknown):ThemePalette{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('A complete palette is required.');
 const record=value as Record<string,unknown>;
 if(Object.keys(record).length!==EDITABLE_COLORS.length)throw new Error('Save all palette colors, with no unknown fields.');
 for(const key of EDITABLE_COLORS)if(typeof record[key]!=='string'||!/^#[a-f\d]{6}$/i.test(record[key]))throw new Error(`Invalid color: ${key}`);
 return Object.fromEntries(EDITABLE_COLORS.map(key=>[key,(record[key] as string).toLowerCase()])) as ThemePalette;
}
export function validateStyleName(value:unknown):string{
 if(typeof value!=='string'||!value.trim()||value.trim().length>60)throw new Error('Use a style name of 1–60 characters.');
 return value.trim();
}
export function validateLibrary(value:unknown):StyleLibrary{
 const v=value as StyleLibrary;
 if(!v||v.version!==1||!Array.isArray(v.styles)||v.styles.length>100)throw new Error('The saved style library is invalid.');
 const ids=new Set<string>(),names=new Set<string>();
 const styles=v.styles.map(style=>{
  if(typeof style.id!=='string'||!/^[\w-]{1,80}$/.test(style.id)||ids.has(style.id))throw new Error('Invalid or duplicate style ID.');
  const name=validateStyleName(style.name);if(names.has(name.toLowerCase()))throw new Error('Duplicate style name.');
  ids.add(style.id);names.add(name.toLowerCase());
  if(typeof style.updatedAt!=='string'||!Number.isFinite(Date.parse(style.updatedAt)))throw new Error('Invalid style date.');
  return {...style,name,colors:validatePalette(style.colors)};
 });
 if(v.activeId!==null&&!ids.has(v.activeId))throw new Error('The active style is missing.');
 return {version:1,activeId:v.activeId,styles};
}
