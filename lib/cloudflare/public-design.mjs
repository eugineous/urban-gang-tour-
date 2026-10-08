// This allowlist contains information pages only. Auth, checkout, receipts,
// ticket verification, APIs and owner-managed article routes use OpenNext.
export async function publicDesignResponse(request,env,routes){
  const url=new URL(request.url);
  const route=url.pathname.replace(/\/$/,'')||'/';
  if(route==='/events'&&url.searchParams.has('event'))return null;
  if(!['GET','HEAD'].includes(request.method)||!routes.includes(route))return null;
  const file=route==='/'?'index.html':route.slice(1)+'/index.html';
  const assetUrl=new URL('/_design-pages/'+file,url);
  const response=await env.ASSETS.fetch(new Request(assetUrl,{method:request.method}));
  if(response.status!==200)return null;
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-cache, must-revalidate');
  headers.set('X-UGT-Design','approved-review-2026-10-08');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','SAMEORIGIN');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security','max-age=31536000');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; media-src 'self'; connect-src 'self' https://urban-gang-tour-events.euginemicah.workers.dev; frame-src https://www.youtube-nocookie.com https://www.youtube.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
  return new Response(request.method==='HEAD'?null:response.body,{status:200,headers});
}
