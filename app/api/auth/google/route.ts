import {NextResponse} from 'next/server';
import {hasDb,q} from '@/lib/server/db';
import {sessionSecretConfigured} from '@/lib/server/session';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {verifyGoogleIdentity} from '@/lib/server/google-identity';
import {signToken,sessionCookie} from '@/lib/server/session';
export async function GET(req:Request){
 if(!rateLimit('google-config:'+clientIp(req),60,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 return NextResponse.json({clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID||null},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
 if(!rateLimit('google-auth:'+clientIp(req),5,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
 if(!hasDb()||!sessionSecretConfigured())return NextResponse.json({error:'accounts_unavailable'},{status:503});
 const clientId=process.env.GOOGLE_OAUTH_CLIENT_ID||process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
 if(!clientId)return NextResponse.json({error:'google_not_configured'},{status:503});
 const body=await req.json().catch(()=>null);
 if(!body||Array.isArray(body)||Object.keys(body).some(k=>k!=='credential')||typeof body.credential!=='string'||body.credential.length<20||body.credential.length>4096)return NextResponse.json({error:'bad_request'},{status:400});
 let email:string|null;try{email=await verifyGoogleIdentity(body.credential,clientId)}catch{return NextResponse.json({error:'verify_unavailable'},{status:502})}
 if(!email)return NextResponse.json({error:'invalid_token'},{status:401});
 const rows=await q('SELECT id,email,phone,name FROM users WHERE email=$1 LIMIT 1',[email]);const u=rows[0];
 if(!u)return NextResponse.json({error:'account_not_found'},{status:401});
 const res=NextResponse.json({ok:true,user:u});
 res.headers.set('Set-Cookie',sessionCookie('ugt_user',signToken({id:u.id,email:u.email,phone:u.phone,name:u.name})));
 return res;
}
