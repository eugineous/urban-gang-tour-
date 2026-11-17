export type GateTicket={event:string;eventDate:string;tier:string;holder:string;position:number;ofCount:number};
export type GateProblem='network'|'timeout'|'rate_limited'|'response'|'offline';
export type GateVerdict=
 |{result:'valid'|'used';ticket:GateTicket;usedAt:string}
 |{result:'invalid';reason?:string}
 |{result:'unverified';reason:GateProblem};
export type GateAccess={result:'allowed'|'signed_out'|'forbidden'}|{result:'unverified';reason:GateProblem};
type Reply={status:number;value?:unknown;reason?:GateProblem};

// The deadline covers headers AND body. A transport failure says nothing about
// whether the admission write committed. Never retry a check automatically.
async function request(path:string,init:RequestInit={},signal?:AbortSignal):Promise<Reply>{
 const controller=new AbortController();let expired=false;let timer:ReturnType<typeof setTimeout>|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;controller.abort();reject(Error('timeout'))},12000)});
 try{
  const response=await Promise.race([fetch(path,{...init,credentials:'same-origin',cache:'no-store',signal:controller.signal}),deadline]);
  if(response.status!==200){void response.body?.cancel().catch(()=>{});return {status:response.status}}
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)return {status:0,reason:'response'};
  reader=response.body.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let text='',bytes=0;
  for(;;){const part=await Promise.race([reader.read(),deadline]);if(part.done)break;bytes+=part.value.byteLength;if(bytes>32768)throw Error('response');text+=decoder.decode(part.value,{stream:true})}
  text+=decoder.decode();let value:unknown;try{value=JSON.parse(text)}catch{throw Error('response')}
  return {status:200,value};
 }catch(error){return {status:0,reason:expired?'timeout':error instanceof Error&&error.message==='response'?'response':'network'}}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);void reader?.cancel().catch(()=>{});controller.abort()}
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function ticket(value:unknown):GateTicket|null{
 if(!object(value)||!['event','eventDate','tier','holder'].every(key=>typeof value[key]==='string'&&(value[key] as string).length<=1200)||!Number.isSafeInteger(value.position)||!Number.isSafeInteger(value.ofCount)||Number(value.position)<1||Number(value.position)>Number(value.ofCount))return null;
 return {event:String(value.event),eventDate:String(value.eventDate),tier:String(value.tier),holder:String(value.holder),position:Number(value.position),ofCount:Number(value.ofCount)};
}
export async function verifyGateTicket(code:string,signal?:AbortSignal):Promise<GateVerdict|{result:'signed_out'}|{result:'forbidden'}>{
 const reply=await request('/api/tickets/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})},signal);
 if(reply.status===401)return {result:'signed_out'};if(reply.status===403)return {result:'forbidden'};
 if(reply.status!==200)return {result:'unverified',reason:reply.status===429?'rate_limited':reply.reason||'network'};
 const value=reply.value;if(!object(value))return {result:'unverified',reason:'response'};
 if(value.result==='invalid')return {result:'invalid',...(typeof value.reason==='string'?{reason:value.reason.slice(0,120)}:{})};
 const details=ticket(value.ticket);
 if((value.result==='valid'||value.result==='used')&&details&&typeof value.usedAt==='string'&&value.usedAt.length<=80&&Number.isFinite(Date.parse(value.usedAt)))return {result:value.result,ticket:details,usedAt:value.usedAt};
 return {result:'unverified',reason:'response'};
}
export async function getGateAccess(signal?:AbortSignal):Promise<GateAccess>{
 const reply=await request('/api/admin/me',{},signal);
 if(reply.status===401)return {result:'signed_out'};if(reply.status===403)return {result:'forbidden'};
 if(reply.status!==200)return {result:'unverified',reason:reply.reason||'network'};
 const value=reply.value;if(!object(value)||value.ok!==true||!['super_admin','crew_admin'].includes(String(value.scope))||!Array.isArray(value.perms))return {result:'unverified',reason:'response'};
 return {result:value.scope==='super_admin'||value.perms.includes('gate_scanner')?'allowed':'forbidden'};
}
