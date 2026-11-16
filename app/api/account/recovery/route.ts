import { NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { q, hasDb } from '@/lib/server/db';
import { hashPassword, clearCookie } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureCustomerAccountSchema } from '@/lib/server/customer-account';
import {ensureCustomerPasskeySchema} from '@/lib/server/customer-passkeys';
import {queueCustomerPasswordReset,deliverSecurityEmailJob} from '@/lib/server/customer-email-verification';
import {normalizeCustomerEmail} from '@/lib/shared/customer-identity';
import {readJsonObject} from '@/lib/server/json-body';

// Public credential endpoint: strict IP limit, constant unknown-email response.
export async function POST(req: Request) {
  if(!requireOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
  if(!rateLimit('buyer-recovery:'+clientIp(req),120,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
  if(!hasDb())return NextResponse.json({error:'accounts_unavailable'},{status:503});
  const parsed=await readJsonObject(req,2048);if(!parsed.ok)return NextResponse.json({error:parsed.error},{status:parsed.status});const b=parsed.value;
  if(!b || typeof b!=='object' || Array.isArray(b) || Object.keys(b).some(k=>!['action','email','token','password'].includes(k)))return NextResponse.json({error:'invalid_request'},{status:400});
  const identity=b.action==='forgot'&&typeof b.email==='string'?normalizeCustomerEmail(b.email):b.action==='reset'&&typeof b.token==='string'?b.token:null;
  if(identity&&!rateLimit('buyer-recovery-identity:'+createHash('sha256').update(identity).digest('hex'),5,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
  try {
    await ensureCustomerAccountSchema();
    if(b.action==='reset') {
      if(Object.keys(b).some(k=>!['action','token','password'].includes(k)))return NextResponse.json({error:'invalid_request'},{status:400});
      if(typeof b.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.token)||typeof b.password!=='string'||b.password.length<8||b.password.length>100)return NextResponse.json({error:'invalid_request'},{status:400});
      const hash=createHash('sha256').update(b.token).digest('hex');
      // Unknown random capabilities must not trigger expensive password hashing.
      const active=await q('SELECT user_id FROM customer_reset_tokens WHERE token_hash=$1 AND expires_at>now() LIMIT 1',[hash]);
      if(!active.length)return NextResponse.json({error:'invalid_or_expired_token'},{status:400});
      await ensureCustomerPasskeySchema();
      // DELETE RETURNING and UPDATE occur in one statement: concurrent replays
      // cannot reset twice and failed transactions do not consume the token.
      const rows=await q(`WITH target AS MATERIALIZED (
        SELECT users.id FROM users JOIN customer_reset_tokens r ON r.user_id=users.id
        WHERE r.token_hash=$1 AND r.expires_at>now() FOR UPDATE OF users
      ), consumed AS (
        DELETE FROM customer_reset_tokens USING target WHERE user_id=target.id AND token_hash=$1 AND expires_at>now() RETURNING user_id
      ), reset AS (
        UPDATE users SET pass_hash=$2, session_version=users.session_version+1 FROM consumed WHERE users.id=consumed.user_id RETURNING users.id
      ), challenges AS (
        DELETE FROM customer_passkey_challenges USING reset WHERE user_id=reset.id RETURNING hash
      ), revoked AS (
        UPDATE customer_passkeys SET revoked_at=now() FROM reset WHERE user_id=reset.id AND revoked_at IS NULL
        AND (SELECT COUNT(*) FROM challenges)>=0 RETURNING customer_passkeys.id
      ) SELECT id FROM reset`,[hash,hashPassword(b.password)]);
      if(!rows.length)return NextResponse.json({error:'invalid_or_expired_token'},{status:400});
      const res=NextResponse.json({ok:true});res.headers.set('Set-Cookie',clearCookie('ugt_user')); return res;
    }
    if(Object.keys(b).some(k=>!['action','email'].includes(k)))return NextResponse.json({error:'invalid_request'},{status:400});
    const email=typeof b.email==='string'?normalizeCustomerEmail(b.email):null;
    if(b.action!=='forgot'||!email)return NextResponse.json({error:'invalid_email'},{status:400});
    // Delivery must be configured before looking up whether the address exists.
    if(!process.env.RESEND_API_KEY||!process.env.SESSION_SECRET)return NextResponse.json({error:'email_delivery_unavailable'},{status:503});
    // Known and unknown addresses receive the same immediate response. Provider
    // timeouts must not disclose account existence or block the browser.
    const job=await queueCustomerPasswordReset(email);
    if(job)after(async()=>{try{await deliverSecurityEmailJob(job)}catch{console.error('[buyer-recovery] queued reset delivery unavailable')}});
    return NextResponse.json({ok:true,message:'If this email has an account, a reset link will be sent.'},{headers:{'Cache-Control':'no-store'}});
  } catch {return NextResponse.json({error:'recovery_unavailable'},{status:503});}
}
