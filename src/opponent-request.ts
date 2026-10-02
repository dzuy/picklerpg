/** Guest sessions are valid identities; no purchase is required for shot selection. */
export async function opponentHeaders():Promise<Record<string,string>>{
 const headers:Record<string,string>={'Content-Type':'application/json'};
 if(import.meta.env?.VITE_SUPABASE_URL){
  const {matchCredentials}=await import('./auth-session');
  headers.Authorization=`Bearer ${(await matchCredentials()).token}`;
 }
 return headers;
}
