import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {
  generateAuthenticationOptions,generateRegistrationOptions,
  verifyAuthenticationResponse,verifyRegistrationResponse,
  type AuthenticationResponseJSON,type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type {PoolClient} from '@neondatabase/serverless';
import {db,hasDb,q,qSchema} from './db';
import {validatedCurrentBuyer} from './customer-account';
import {checkPassword,currentUser,sessionCookie,signToken} from './session';
import {requireOrigin} from './origin';
import {readJsonObject} from './json-body';
import {clientIp,rateLimit} from './ratelimit';

const RP_ID='urbangangtour.co.ke';
const ORIGINS=['https://urbangangtour.co.ke','https://www.urbangangtour.co.ke'];
const OWNER_COOKIE='ugt_passkey_owner';
const ALGORITHMS=[-7,-257];
let schema:Promise<void>|undefined;

// Additive only: a user's passkeys never derive their stable user handle from
// SESSION_SECRET, email, phone, or another changing identifier.
export function ensureCustomerPasskeySchema(){
  if(!schema)schema=qSchema(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS customer_passkey_accounts (
      user_id INTEGER PRIMARY KEY REFERENCES users(id), handle TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS customer_passkeys (
      id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),public_key TEXT NOT NULL,
      counter BIGINT NOT NULL CHECK(counter>=0),slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 10),
      transports JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),last_used_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_passkey_slot ON customer_passkeys(user_id,slot) WHERE revoked_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_customer_passkey_user ON customer_passkeys(user_id) WHERE revoked_at IS NULL;
    CREATE TABLE IF NOT EXISTS customer_passkey_challenges (
      hash TEXT PRIMARY KEY,owner_hash TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('register','login')),
      user_id INTEGER REFERENCES users(id),session_version INTEGER,expires_at TIMESTAMPTZ NOT NULL,
      CHECK((kind='register' AND user_id IS NOT NULL AND session_version IS NOT NULL) OR
            (kind='login' AND user_id IS NULL AND session_version IS NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_customer_passkey_expiry ON customer_passkey_challenges(expires_at);
    CREATE INDEX IF NOT EXISTS idx_customer_passkey_challenge_user ON customer_passkey_challenges(user_id);
  `).catch(error=>{schema=undefined;throw error});
  return schema;
}

class PasskeyFailure extends Error{
  constructor(readonly status:number,readonly code:string){super(code)}
}
const fail=(status=401,code='passkey_failed'):never=>{throw new PasskeyFailure(status,code)};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const ownerHeader=(value='',maxAge=0)=>`${OWNER_COOKIE}=${value}; Path=/api/account/passkeys; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const isObject=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const only=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).every(key=>keys.includes(key));
function base64(value:unknown,min:number,max:number):value is string{
  return typeof value==='string'&&value.length>=min&&value.length<=max&&/^[A-Za-z0-9_-]+$/.test(value)&&Buffer.from(value,'base64url').toString('base64url')===value;
}
function owner(req:Request){
  const values=(req.headers.get('cookie')||'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(OWNER_COOKIE+'='));
  const value=values.length===1?values[0].slice(OWNER_COOKIE.length+1):'';
  if(!base64(value,43,43))return fail();return digest(value);
}
function credentialInput(value:unknown,kind:'register'|'login'):RegistrationResponseJSON|AuthenticationResponseJSON{
  if(!isObject(value)||!only(value,['id','rawId','type','response','clientExtensionResults','authenticatorAttachment'])||
    !base64(value.id,16,1024)||value.rawId!==value.id||value.type!=='public-key'||!isObject(value.response)||
    !isObject(value.clientExtensionResults)||Object.keys(value.clientExtensionResults).length>16||
    (value.authenticatorAttachment!==undefined&&value.authenticatorAttachment!==null&&!['platform','cross-platform'].includes(String(value.authenticatorAttachment))))return fail(400,'invalid_request');
  const r=value.response;
  if(!only(r,kind==='register'?['clientDataJSON','attestationObject','transports','publicKeyAlgorithm','publicKey','authenticatorData']:['clientDataJSON','authenticatorData','signature','userHandle'])||!base64(r.clientDataJSON,16,16384))return fail(400,'invalid_request');
  if(kind==='register'){
    if(!base64(r.attestationObject,16,49152)||(r.transports!==undefined&&(!Array.isArray(r.transports)||r.transports.length>8||!r.transports.every(t=>typeof t==='string'&&['ble','cable','hybrid','internal','nfc','smart-card','usb'].includes(t)))))return fail(400,'invalid_request');
  }else if(!base64(r.authenticatorData,16,16384)||!base64(r.signature,16,4096)||!base64(r.userHandle,43,43))return fail(400,'invalid_request');
  return value as unknown as RegistrationResponseJSON|AuthenticationResponseJSON;
}
async function transaction<T>(run:(client:PoolClient)=>Promise<T>):Promise<T>{
  const pool=db();if(!pool)throw Error('db_not_configured');const client=await pool.connect();
  try{await client.query('BEGIN');const result=await run(client);await client.query('COMMIT');return result}
  catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release();await pool.end()}
}
type Buyer={id:number;email:string;phone:string|null;name:string;pass_hash:string;email_verified_at:string|null;session_version:number};
async function activeBuyer(req:Request){
  const buyer=await validatedCurrentBuyer(req);if(!buyer)return fail(401,'login_required');return buyer;
}
async function passwordBuyer(client:PoolClient,req:Request,id:number,password:string){
  const result=await client.query<Buyer>('SELECT id,email,phone,name,pass_hash,email_verified_at,session_version FROM users WHERE id=$1 FOR UPDATE',[id]);
  const user=result.rows[0],token=currentUser(req);
  if(!user||!token||(token.sessionVersion??0)!==Number(user.session_version))return fail(401,'login_required');
  if(!checkPassword(password,user.pass_hash||''))return fail(401,'authentication_failed');
  return user;
}
async function saveChallenge(client:PoolClient,challenge:string,ownerValue:string,kind:'register'|'login',user?:Buyer){
  await client.query(`INSERT INTO customer_passkey_challenges(hash,owner_hash,kind,user_id,session_version,expires_at)
    VALUES($1,$2,$3,$4,$5,now()+interval '5 minutes')`,[digest(challenge),digest(ownerValue),kind,user?.id??null,user?.session_version??null]);
  // Bounded housekeeping of short-lived credentials only. Customer rows stay intact.
  await client.query(`DELETE FROM customer_passkey_challenges WHERE hash IN
    (SELECT hash FROM customer_passkey_challenges WHERE expires_at<=now() ORDER BY expires_at LIMIT 100)`);
}
async function lockChallenge(client:PoolClient,challenge:string,ownerHash:string,kind:'register'|'login',lock=true){
  const result=await client.query<{hash:string;user_id:number|null;session_version:number|null}>(`SELECT hash,user_id,session_version FROM customer_passkey_challenges
    WHERE hash=$1 AND owner_hash=$2 AND kind=$3 AND expires_at>clock_timestamp() ${lock?'FOR UPDATE':''}`,[digest(challenge),ownerHash,kind]);
  if(!result.rows.length)return fail();return result.rows[0];
}
async function registrationOptions(req:Request,password:string){
  const buyer=await activeBuyer(req);if(!rateLimit('passkeys-password:'+buyer.id,8,60000))return fail(429,'too_many_requests');
  const ownerValue=random();
  const options=await transaction(async client=>{
    const user=await passwordBuyer(client,req,buyer.id,password);
    if(!user.email||!user.email_verified_at)return fail(403,'verified_email_required');
    const existing=await client.query<{id:string}>('SELECT id FROM customer_passkeys WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
    if(existing.rows.length>=10)return fail(409,'passkey_limit');
    await client.query('INSERT INTO customer_passkey_accounts(user_id,handle) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[user.id,random()]);
    const handles=await client.query<{handle:string}>('SELECT handle FROM customer_passkey_accounts WHERE user_id=$1',[user.id]);
    const options=await generateRegistrationOptions({rpName:'Urban Gang Tour',rpID:RP_ID,userName:user.email,userDisplayName:user.name||user.email,
      userID:new Uint8Array(Buffer.from(handles.rows[0].handle,'base64url')),timeout:300000,attestationType:'none',
      supportedAlgorithmIDs:ALGORITHMS,authenticatorSelection:{residentKey:'required',requireResidentKey:true,userVerification:'required'},excludeCredentials:existing.rows});
    await saveChallenge(client,options.challenge,ownerValue,'register',user);return options;
  });
  const response=reply({ok:true,options});response.headers.set('Set-Cookie',ownerHeader(ownerValue,300));return response;
}
async function loginOptions(){
  const ownerValue=random(),options=await generateAuthenticationOptions({rpID:RP_ID,timeout:300000,userVerification:'required'});
  await transaction(client=>saveChallenge(client,options.challenge,ownerValue,'login'));
  const response=reply({ok:true,options});response.headers.set('Set-Cookie',ownerHeader(ownerValue,300));return response;
}
async function registrationFinish(req:Request,challenge:string,credential:RegistrationResponseJSON){
  const ownerHash=owner(req),buyer=await activeBuyer(req),token=currentUser(req)!;
  await transaction(async client=>{
    const pending=await lockChallenge(client,challenge,ownerHash,'register',false);
    if(Number(pending.user_id)!==buyer.id||Number(pending.session_version)!==(token.sessionVersion??0))return fail();
    const users=await client.query<Buyer>('SELECT id,email,phone,name,pass_hash,email_verified_at,session_version FROM users WHERE id=$1 FOR UPDATE',[buyer.id]);
    const user=users.rows[0];if(!user||!user.email_verified_at||Number(user.session_version)!==Number(pending.session_version))return fail();
    // All credential mutations lock user -> challenge -> key, including reset.
    // Recheck after the user lock: a concurrent reset may have consumed it.
    await lockChallenge(client,challenge,ownerHash,'register');
    let verified;
    try{verified=await verifyRegistrationResponse({response:credential,expectedChallenge:challenge,expectedOrigin:ORIGINS,expectedRPID:RP_ID,requireUserPresence:true,requireUserVerification:true,supportedAlgorithmIDs:ALGORITHMS})}catch{return fail()}
    if(!verified.verified)return fail();
    const saved=verified.registrationInfo.credential;
    // Holding the account row serializes slot allocation and password resets.
    // Global ID uniqueness prevents a registration from stealing any existing key.
    const inserted=await client.query(`INSERT INTO customer_passkeys(id,user_id,public_key,counter,slot,transports)
      SELECT $1,$2,$3,$4,slot,$5::jsonb FROM generate_series(1,10) slot
      WHERE NOT EXISTS(SELECT 1 FROM customer_passkeys WHERE user_id=$2 AND slot=slot.slot AND revoked_at IS NULL)
      ORDER BY slot LIMIT 1 ON CONFLICT DO NOTHING RETURNING id`,
      [saved.id,user.id,Buffer.from(saved.publicKey).toString('base64url'),saved.counter,JSON.stringify(saved.transports||[])]);
    if(!inserted.rows.length)return fail(409,'passkey_unavailable');
    await client.query('DELETE FROM customer_passkey_challenges WHERE hash=$1',[pending.hash]);
  });
  const response=reply({ok:true});response.headers.set('Set-Cookie',ownerHeader());return response;
}
type StoredKey={id:string;user_id:number;public_key:string;counter:string|number;handle:string};
async function loginFinish(req:Request,challenge:string,credential:AuthenticationResponseJSON){
  const ownerHash=owner(req);
  if(!rateLimit('passkeys-credential:'+digest(credential.id),8,60000))return fail(429,'too_many_requests');
  const user=await transaction(async client=>{
    const pending=await lockChallenge(client,challenge,ownerHash,'login',false);
    // Read credential identity only after the cheap, owner-bound challenge lookup.
    const keys=await client.query<StoredKey>(`SELECT p.id,p.user_id,p.public_key,p.counter,a.handle FROM customer_passkeys p
      JOIN customer_passkey_accounts a ON a.user_id=p.user_id WHERE p.id=$1 AND p.revoked_at IS NULL`,[credential.id]);
    const key=keys.rows[0];if(!key)return fail();
    const handle=Buffer.from(credential.response.userHandle!,'base64url'),storedHandle=Buffer.from(key.handle,'base64url');
    if(handle.length!==storedHandle.length||!timingSafeEqual(handle,storedHandle))return fail();
    const users=await client.query<Buyer>('SELECT id,email,phone,name,pass_hash,email_verified_at,session_version FROM users WHERE id=$1 FOR UPDATE',[key.user_id]);
    const user=users.rows[0];if(!user||!user.email||!user.email_verified_at)return fail();
    await lockChallenge(client,challenge,ownerHash,'login');
    // Lock the credential after the user, matching revoke/reset lock order.
    const current=await client.query<{counter:string|number;public_key:string}>('SELECT counter,public_key FROM customer_passkeys WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL FOR UPDATE',[credential.id,user.id]);
    if(!current.rows.length||current.rows[0].public_key!==key.public_key)return fail();
    const counter=Number(current.rows[0].counter);if(!Number.isSafeInteger(counter)||counter<0)return fail();
    let verification;
    try{verification=await verifyAuthenticationResponse({response:credential,expectedChallenge:challenge,expectedOrigin:ORIGINS,expectedRPID:RP_ID,
      credential:{id:key.id,publicKey:new Uint8Array(Buffer.from(key.public_key,'base64url')),counter},requireUserVerification:true})}catch{return fail()}
    if(!verification.verified)return fail();
    const updated=await client.query(`UPDATE customer_passkeys SET counter=$1,last_used_at=now()
      WHERE id=$2 AND user_id=$3 AND counter=$4 AND revoked_at IS NULL RETURNING id`,[verification.authenticationInfo.newCounter,key.id,user.id,counter]);
    if(updated.rows.length!==1)return fail();
    await client.query('DELETE FROM customer_passkey_challenges WHERE hash=$1',[pending.hash]);return user;
  });
  const profile={id:Number(user.id),email:user.email,phone:user.phone,name:user.name};
  const response=reply({ok:true,user:profile});
  // Mint only after both counter update and one-use challenge consumption commit.
  response.headers.append('Set-Cookie',sessionCookie('ugt_user',signToken({...profile,sessionVersion:Number(user.session_version)})));
  response.headers.append('Set-Cookie',ownerHeader());return response;
}
async function revoke(req:Request,id:string,password:string){
  const buyer=await activeBuyer(req);if(!rateLimit('passkeys-password:'+buyer.id,8,60000))return fail(429,'too_many_requests');
  await transaction(async client=>{
    const user=await passwordBuyer(client,req,buyer.id,password);
    const updated=await client.query('UPDATE customer_passkeys SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING id',[id,user.id]);
    if(updated.rows.length!==1)return fail(404,'passkey_unavailable');
  });return reply({ok:true});
}
function failure(error:unknown){return error instanceof PasskeyFailure?reply({error:error.code},error.status):reply({error:'passkeys_unavailable'},503)}

// Public login actions; account-owned registration/list/revoke. Every mutation
// has canonical Origin, bounded JSON, network and signed-subject/key budgets.
export async function passkeyPost(req:Request){
  if(!requireOrigin(req)||!ORIGINS.includes(req.headers.get('origin')||''))return reply({error:'bad_origin'},403);
  if(!rateLimit('passkeys-network:'+clientIp(req),120,60000))return reply({error:'too_many_requests'},429);
  const body=await readJsonObject(req,65536);if(!body.ok)return reply({error:body.error},body.status);
  const value=body.value,action=value.action;
  const fields:Record<string,string[]>={'register-options':['action','password'],'register-finish':['action','challenge','credential'],'login-options':['action'],'login-finish':['action','challenge','credential'],revoke:['action','id','password']};
  if(typeof action!=='string'||!Object.hasOwn(fields,action)||!only(value,fields[action]))return reply({error:'invalid_request'},400);
  try{
    if(['register-options','revoke'].includes(action)&&(typeof value.password!=='string'||!value.password.length||value.password.length>100))return fail(400,'invalid_request');
    if(!hasDb())throw Error('db_not_configured');await ensureCustomerPasskeySchema();
    if(action==='register-options')return await registrationOptions(req,value.password as string);
    if(action==='login-options')return await loginOptions();
    if(action==='revoke'){if(!base64(value.id,16,1024))return fail(400,'invalid_request');return await revoke(req,value.id,value.password as string)}
    if(!base64(value.challenge,43,43))return fail(400,'invalid_request');
    if(action==='register-finish')return await registrationFinish(req,value.challenge,credentialInput(value.credential,'register') as RegistrationResponseJSON);
    return await loginFinish(req,value.challenge,credentialInput(value.credential,'login') as AuthenticationResponseJSON);
  }catch(error){return failure(error)}
}
export async function passkeyGet(req:Request){
  if(!rateLimit('passkeys-read:'+clientIp(req),120,60000,req))return reply({error:'too_many_requests'},429);
  try{const user=await activeBuyer(req);await ensureCustomerPasskeySchema();const passkeys=await q('SELECT id,created_at,last_used_at FROM customer_passkeys WHERE user_id=$1 AND revoked_at IS NULL ORDER BY created_at,id',[user.id]);return reply({ok:true,passkeys})}catch(error){return failure(error)}
}
