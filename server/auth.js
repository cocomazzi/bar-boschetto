import {HttpError} from './http.js';
const keyCache=new Map();
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
const parse=s=>JSON.parse(new TextDecoder().decode(decode(s)));
export async function authenticate(request,env){
 const host=String(env.ACCESS_TEAM_DOMAIN||'').replace(/^https:\/\//,'').replace(/\/$/,'');
 const aud=String(env.ACCESS_AUD||'');
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(host)||!aud)throw new HttpError(503,'ACCESS_NOT_CONFIGURED');
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token||token.length>16384)throw new HttpError(401,'LOGIN_REQUIRED');
 try{
  const parts=token.split('.');if(parts.length!==3)throw Error();
  const header=parse(parts[0]),claims=parse(parts[1]),now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.iss!=='https://'+host||!claims.sub||!claims.email||!Number.isFinite(claims.exp)||claims.exp<=now||(claims.nbf&&claims.nbf>now)||!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(aud))throw Error();
  let cached=keyCache.get(host);
  if(!cached||cached.expires<Date.now()||!cached.keys.some(k=>k.kid===header.kid)){
   const response=await fetch('https://'+host+'/cdn-cgi/access/certs');if(!response.ok)throw Error();
   const jwks=await response.json();cached={keys:jwks.keys||[],expires:Date.now()+300000};keyCache.set(host,cached);
  }
  const jwk=cached.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)throw Error();
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error();
  return {id:claims.sub,email:claims.email};
 }catch{throw new HttpError(401,'LOGIN_REQUIRED')}
}
