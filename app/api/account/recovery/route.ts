import { NextResponse, after } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { q, hasDb } from '@/lib/server/db';
import { hashPassword, clearCookie } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { ensureCustomerAccountSchema } from '@/lib/server/customer-account';

// Public credential endpoint: strict IP limit, constant unknown-email response.
export async function POST(req: Request) {
  if(!requireOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
  if(!rateLimit('buyer-recovery:'+clientIp(req),5,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
  if(!hasDb())return NextResponse.json({error:'accounts_unavailable'},{status:503});
  const b=await req.json().catch(()=>null);
  if(!b || typeof b!=='object' || Array.isArray(b) || Object.keys(b).some(k=>!['action','email','token','password'].includes(k)))return NextResponse.json({error:'invalid_request'},{status:400});
  try {
    await ensureCustomerAccountSchema();
    if(b.action==='reset') {
      if(Object.keys(b).some(k=>!['action','token','password'].includes(k)))return NextResponse.json({error:'invalid_request'},{status:400});
      if(typeof b.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.token)||typeof b.password!=='string'||b.password.length<8||b.password.length>100)return NextResponse.json({error:'invalid_request'},{status:400});
      const hash=createHash('sha256').update(b.token).digest('hex');
      // DELETE RETURNING and UPDATE occur in one statement: concurrent replays
      // cannot reset twice and failed transactions do not consume the token.
      const rows=await q(`WITH consumed AS (
        DELETE FROM customer_reset_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id
      ) UPDATE users SET pass_hash=$2, session_version=users.session_version+1 FROM consumed WHERE users.id=consumed.user_id RETURNING users.id`,[hash,hashPassword(b.password)]);
      if(!rows.length)return NextResponse.json({error:'invalid_or_expired_token'},{status:400});
      const res=NextResponse.json({ok:true});res.headers.set('Set-Cookie',clearCookie('ugt_user')); return res;
    }
    if(Object.keys(b).some(k=>!['action','email'].includes(k)))return NextResponse.json({error:'invalid_request'},{status:400});
    if(b.action!=='forgot'||typeof b.email!=='string'||b.email.length>254||! /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email))return NextResponse.json({error:'invalid_email'},{status:400});
    // Delivery must be configured before looking up whether the address exists.
    if(!process.env.RESEND_API_KEY)return NextResponse.json({error:'email_delivery_unavailable'},{status:503});
    const email=b.email.trim().toLowerCase();
    // Known and unknown addresses receive the same immediate response. Provider
    // timeouts must not disclose account existence or block the browser.
    after(async () => {
      try {
        const rows=await q('SELECT id FROM users WHERE email=$1',[email]);
        if(!rows.length) return;
        const raw=randomBytes(32).toString('base64url'); const hash=createHash('sha256').update(raw).digest('hex');
        // One active link per account. Concurrent requests replace rather than
        // accumulating tokens, and only hashes are persisted.
        await q(`INSERT INTO customer_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')
          ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at`,[hash,rows[0].id]);
        const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.BOOKINGS_FROM||'Urban Gang Tour <admin@urbangangtour.co.ke>',to:email,subject:'Reset your Urban Gang Tour password',text:`Reset your password within one hour:\nhttps://urbangangtour.co.ke/account?reset=${raw}\n\nIf you did not request this, ignore this message.`}),signal:AbortSignal.timeout(10000)});
        if(!response.ok) console.error('[buyer-recovery] email provider rejected delivery');
      } catch { console.error('[buyer-recovery] reset delivery unavailable'); }
    });
    return NextResponse.json({ok:true,message:'If this email has an account, a reset link will be sent.'},{headers:{'Cache-Control':'no-store'}});
  } catch {return NextResponse.json({error:'recovery_unavailable'},{status:503});}
}
