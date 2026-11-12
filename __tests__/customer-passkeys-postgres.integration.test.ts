/** Real signatures + disposable network-none PostgreSQL. No production traffic or keys. */
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createPrivateKey,sign,createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium,type Browser,type Page,type CDPSession} from 'playwright';
import type {PublicKeyCredentialCreationOptionsJSON,PublicKeyCredentialRequestOptionsJSON} from '@simplewebauthn/server';
import {verifyAuthenticationResponse} from '@simplewebauthn/server';
import {DisposablePostgres} from './helpers/disposable-postgres';
const transport=vi.hoisted(()=>({query:undefined as unknown as (sql:string,args?:unknown[])=>Promise<Record<string,unknown>[]>,schema:undefined as unknown as (sql:string)=>Promise<void>,pool:undefined as unknown as ()=>unknown}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:(sql:string,args?:unknown[])=>transport.query(sql,args),qSchema:(sql:string)=>transport.schema(sql),db:()=>transport.pool()}));
import {hashPassword,signToken,currentUser} from '@/lib/server/session';

const origin='https://urbangangtour.co.ke',password='Synthetic fixture password 2026';
type Route={POST:(req:Request)=>Promise<Response>;GET:(req:Request)=>Promise<Response>};
type Options={options:PublicKeyCredentialCreationOptionsJSON&PublicKeyCredentialRequestOptionsJSON;owner:string};
type BrowserApi={webauthn:typeof import('@simplewebauthn/browser')};
let route:Route,browser:Browser,page:Page,cdp:CDPSession,authenticatorId:string;
const postgres=new DisposablePostgres();
let uid:number,cookie:string;
const request=(body:unknown,cookies='',requestOrigin:string|null=origin)=>new Request(origin+'/api/account/passkeys',{method:'POST',headers:{'content-type':'application/json',cookie:cookies,...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(body)});
const post=(body:unknown,cookies=cookie)=>route.POST(request(body,cookies));
const ownerCookie=(res:Response)=>(res.headers.get('set-cookie')||'').split(';')[0];
const numeric=(rows:Record<string,unknown>[])=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,['id','user_id','session_version','slot','counter'].includes(key)&&typeof value==='string'&&/^\d+$/.test(value)?Number(value):value])));
async function options(action='register-options',cookies=cookie):Promise<Options>{const response=await post({action,...(action==='register-options'?{password}:{})},cookies);expect(response.status).toBe(200);const body=await response.json();return {options:body.options,owner:ownerCookie(response)}}
async function create(options:PublicKeyCredentialCreationOptionsJSON){return page.evaluate(async options=>{const api=(window as unknown as BrowserApi).webauthn;return api.startRegistration({optionsJSON:options})},options)}
async function authenticate(options:PublicKeyCredentialRequestOptionsJSON){return page.evaluate(async options=>{const api=(window as unknown as BrowserApi).webauthn;return api.startAuthentication({optionsJSON:options})},options)}
async function register(){const prepared=await options();const credential=await create(prepared.options);const response=await post({action:'register-finish',challenge:prepared.options.challenge,credential},cookie+'; '+prepared.owner);expect(response.status).toBe(200);return credential}
async function assertion(){const prepared=await options('login-options','');return {...prepared,credential:await authenticate(prepared.options)}}
const finish=(prepared:Awaited<ReturnType<typeof assertion>>,owner=prepared.owner)=>post({action:'login-finish',challenge:prepared.options.challenge,credential:prepared.credential},owner);
async function signedMutation(prepared:Awaited<ReturnType<typeof assertion>>,mutation:'uv'|'origin'|'counter-zero'){
 const exported=await cdp.send('WebAuthn.getCredentials',{authenticatorId}) as {credentials:{credentialId:string;privateKey:string}[]};
 const fixture=exported.credentials.find(c=>Buffer.from(c.credentialId,'base64').toString('base64url')===prepared.credential.id);
 if(!fixture)throw Error('synthetic_fixture_key_missing');
 const credential=structuredClone(prepared.credential),authData=Buffer.from(credential.response.authenticatorData,'base64url');
 if(mutation==='uv')authData[32]&=~4;
 if(mutation==='counter-zero')authData.writeUInt32BE(0,33);
 if(mutation==='origin'){const client=JSON.parse(Buffer.from(credential.response.clientDataJSON,'base64url').toString());client.origin='https://attacker.invalid';credential.response.clientDataJSON=Buffer.from(JSON.stringify(client)).toString('base64url')}
 const signed=Buffer.concat([authData,createHash('sha256').update(Buffer.from(credential.response.clientDataJSON,'base64url')).digest()]);
 credential.response.authenticatorData=authData.toString('base64url');
 credential.response.signature=sign('sha256',signed,createPrivateKey({key:Buffer.from(fixture.privateKey,'base64'),format:'der',type:'pkcs8'})).toString('base64url');
 const stored=(await transport.query('SELECT public_key,counter FROM customer_passkeys WHERE id=$1',[credential.id]))[0];
 // Prove these negative fixtures carry a real valid signature. Only the
 // deliberately altered policy (UV/origin/counter) is relaxed in this check.
 const checked=await verifyAuthenticationResponse({response:credential,expectedChallenge:prepared.options.challenge,expectedOrigin:mutation==='origin'?'https://attacker.invalid':origin,expectedRPID:'urbangangtour.co.ke',requireUserVerification:mutation!=='uv',credential:{id:credential.id,publicKey:new Uint8Array(Buffer.from(String(stored.public_key),'base64url')),counter:mutation==='counter-zero'?0:Number(stored.counter)}});
 expect(checked.verified).toBe(true);
 return {...prepared,credential};
}

describe('native passkeys with actual WebAuthn and PostgreSQL',()=>{
 beforeAll(async()=>{
  // Catch absent implementation as an assertion (the initial RED), not a mocked verifier.
  const path='../app/api/account/passkeys/route';const loaded=await import(path).catch(()=>null);
  expect(loaded,'passkey endpoint must exist').not.toBeNull();route=loaded!;
  if(process.env.UGT_EDITORIAL_SQL_CONTAINER)throw Error('new_disposable_container_required');
  postgres.start();let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=postgres.ready()}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,100))}expect(ready).toBe(true);
  transport.query=async(sql,args)=>numeric(await postgres.query(sql,args));transport.schema=sql=>postgres.schema(sql);
  transport.pool=()=>{const client=postgres.connect();return {connect:async()=>({query:async(sql:string,args?:unknown[])=>({rows:numeric((await client.query(sql,args)).rows)}),release:()=>{}}),end:()=>client.end()}};
  await postgres.schema('CREATE TABLE users(id SERIAL PRIMARY KEY,email TEXT,phone TEXT,name TEXT,pass_hash TEXT)');
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext();
  // Fulfil every request locally. The canonical host is never contacted.
  await context.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Isolated passkey fixture</title>'}));
  page=await context.newPage();await page.goto(origin);cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
  ({authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}}));
  const bundle=await build({stdin:{contents:'import * as api from "@simplewebauthn/browser";window.webauthn=api;',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
 },30000);
 beforeEach(async()=>{
  if(!page)return;
  await cdp.send('WebAuthn.clearCredentials',{authenticatorId});
  const rows=await transport.query('INSERT INTO users(email,name,pass_hash) VALUES($1,$2,$3) RETURNING id',['fixture@example.invalid','Synthetic passkey buyer',hashPassword(password)]);uid=Number(rows[0].id);
  cookie='ugt_user='+signToken({id:uid,email:'fixture@example.invalid',name:'Synthetic passkey buyer',sessionVersion:0});
  // Initialization is exercised through the public API, then verification is persisted explicitly.
  await post({action:'login-options'},'');
  await transport.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[uid]);
 });
 afterAll(async()=>{await browser?.close();postgres.stop()},15000);

 it('registers a resident verified credential, lists only safe metadata, then signs a versioned buyer session',async()=>{
  const prepared=await options();expect(prepared.options).toMatchObject({rp:{id:'urbangangtour.co.ke'},attestation:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'}});
  expect(prepared.options.pubKeyCredParams.map(p=>p.alg)).toEqual([-7,-257]);
  expect(Buffer.from(prepared.options.user.id,'base64url')).toHaveLength(32);
  const credential=await create(prepared.options);
  const registered=await post({action:'register-finish',challenge:prepared.options.challenge,credential},cookie+'; '+prepared.owner);expect(registered.status).toBe(200);
  const list=await route.GET(new Request(origin+'/api/account/passkeys',{headers:{cookie}}));expect(list.headers.get('cache-control')).toBe('private, no-store');
  const data=await list.json();expect(data.passkeys).toHaveLength(1);expect(data.passkeys[0].id).toBe(credential.id);expect(Object.keys(data.passkeys[0]).sort()).toEqual(['created_at','id','last_used_at']);
  const auth=await assertion();expect(auth.options.allowCredentials||[]).toEqual([]);const response=await finish(auth);expect(response.status).toBe(200);expect((await response.json()).user.id).toBe(uid);
  const minted=response.headers.get('set-cookie')||'';expect(currentUser(new Request(origin,{headers:{cookie:minted}}))).toMatchObject({id:uid,sessionVersion:0});
 });
 it('requires the current password, persisted email verification, active session, and canonical Origin',async()=>{
  expect((await post({action:'register-options',password:'wrong'})).status).toBe(401);
  await transport.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',[uid]);expect((await post({action:'register-options',password})).status).toBe(403);
  expect((await route.POST(request({action:'login-options'},'',null))).status).toBe(403);
  for(const bad of ['https://attacker.invalid','https://urbangangtour.co.ke.attacker.invalid','http://urbangangtour.co.ke','http://localhost:3000'])expect((await route.POST(request({action:'login-options'},'',bad))).status).toBe(403);
  await transport.query('UPDATE users SET session_version=session_version+1 WHERE id=$1',[uid]);expect((await post({action:'register-options',password})).status).toBe(401);
 });
 it('rejects cross-owner, expired, replayed and session-rotated registration challenges',async()=>{
  const prepared=await options(),credential=await create(prepared.options),body={action:'register-finish',challenge:prepared.options.challenge,credential};
  expect((await post(body,cookie+'; ugt_passkey_owner='+('a'.repeat(43)))).status).toBe(401);
  expect((await post(body,cookie+'; '+prepared.owner)).status).toBe(200);expect((await post(body,cookie+'; '+prepared.owner)).status).toBe(401);
  const rotated=await options();await cdp.send('WebAuthn.clearCredentials',{authenticatorId});const second=await create(rotated.options);await transport.query('UPDATE users SET session_version=1 WHERE id=$1',[uid]);expect((await post({action:'register-finish',challenge:rotated.options.challenge,credential:second},cookie+'; '+rotated.owner)).status).toBe(401);
 });
 it('expires login challenges, rejects cross-owner assertions, and permits a single concurrent winner',async()=>{
  await register();const expired=await assertion();await transport.query("UPDATE customer_passkey_challenges SET expires_at=now()-interval '1 second'");expect((await finish(expired)).status).toBe(401);
  const prepared=await assertion();expect((await finish(prepared,'ugt_passkey_owner='+('b'.repeat(43)))).status).toBe(401);
  const responses=await Promise.all([finish(prepared),finish(prepared)]);expect(responses.map(r=>r.status).sort()).toEqual([200,401]);expect((await finish(prepared)).status).toBe(401);
 });
 it('rejects validly signed UV-off and wrong-origin assertions and incorrect user handles',async()=>{
  await register();for(const mutation of ['uv','origin'] as const){const prepared=await signedMutation(await assertion(),mutation);expect((await finish(prepared)).status).toBe(401)}
  const wrongHandle=await assertion();wrongHandle.credential.response.userHandle=Buffer.alloc(32,7).toString('base64url');expect((await finish(wrongHandle)).status).toBe(401);
 });
 it('requires password and scoped ownership for revocation, then rejects the revoked credential',async()=>{
  const credential=await register(),auth=await assertion();expect((await post({action:'revoke',id:credential.id,password:'wrong'})).status).toBe(401);
  expect((await post({action:'revoke',id:credential.id,password})).status).toBe(200);expect((await finish(auth)).status).toBe(401);
  const rows=await transport.query('SELECT revoked_at FROM customer_passkeys WHERE id=$1',[credential.id]);expect(rows[0].revoked_at).not.toBeNull();
 });
 it('accepts synced zero counters and rejects a signed counter regression after a positive counter',async()=>{
  await register();
  // Chromium's virtual authenticator registers at 1. Model a synced key's
  // initial zero counter, then sign actual zero-counter assertions with its key.
  await transport.query('UPDATE customer_passkeys SET counter=0 WHERE user_id=$1',[uid]);
  expect((await finish(await signedMutation(await assertion(),'counter-zero'))).status).toBe(200);
  expect((await finish(await signedMutation(await assertion(),'counter-zero'))).status).toBe(200);
  expect((await finish(await assertion())).status).toBe(200);
  expect((await finish(await signedMutation(await assertion(),'counter-zero'))).status).toBe(401);
 });
 it('keeps a stable opaque handle across options and enforces ten active slots atomically',async()=>{
  const first=await options(),second=await options();expect(second.options.user.id).toBe(first.options.user.id);
  const credential=await create(second.options);
  for(let slot=1;slot<=10;slot++)await transport.query('INSERT INTO customer_passkeys(id,user_id,public_key,counter,slot) VALUES($1,$2,$3,0,$4)',[Buffer.from('synthetic-slot-'+uid+'-'+slot).toString('base64url'),uid,'synthetic-not-a-real-key',slot]);
  expect((await post({action:'register-finish',challenge:second.options.challenge,credential},cookie+'; '+second.owner)).status).toBe(409);
  expect((await transport.query('SELECT count(*) AS count FROM customer_passkeys WHERE user_id=$1 AND revoked_at IS NULL',[uid]))[0].count).toBe('10');
  expect((await post({action:'register-options',password})).status).toBe(409);
  expect((await transport.query('SELECT hash FROM customer_passkey_challenges WHERE user_id=$1',[uid])).length).toBe(2);
 });
 it('never steals a globally registered credential or revokes a different account’s key',async()=>{
  const prepared=await options(),credential=await create(prepared.options);
  const other=await transport.query('INSERT INTO users(email,name,pass_hash,email_verified_at,session_version) VALUES($1,$2,$3,now(),0) RETURNING id',['other@example.invalid','Other synthetic buyer',hashPassword(password)]),otherId=Number(other[0].id);
  await transport.query('INSERT INTO customer_passkeys(id,user_id,public_key,counter,slot) VALUES($1,$2,$3,0,1)',[credential.id,otherId,'synthetic-conflicting-key']);
  expect((await post({action:'register-finish',challenge:prepared.options.challenge,credential},cookie+'; '+prepared.owner)).status).toBe(409);
  expect((await post({action:'revoke',id:credential.id,password})).status).toBe(404);
  expect((await transport.query('SELECT user_id,public_key,revoked_at FROM customer_passkeys WHERE id=$1',[credential.id]))[0]).toMatchObject({user_id:otherId,public_key:'synthetic-conflicting-key',revoked_at:null});
 });
 it('does not log in an account whose persisted email verification was removed',async()=>{
  await register();const prepared=await assertion();await transport.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',[uid]);expect((await finish(prepared)).status).toBe(401);
 });
 it('rejects oversize bodies, unexpected fields and malformed credential identifiers',async()=>{
  expect((await post({action:'login-options',email:'private@example.invalid'},'')).status).toBe(400);
  expect((await post({action:'login-finish',challenge:'a'.repeat(43),credential:{id:'bad',rawId:'bad',type:'public-key',response:{}}},'')).status).toBe(400);
  expect((await post({action:'login-options',padding:'x'.repeat(65536)},'')).status).toBe(413);
 });
});
