// Deliberately dependency-free: AccountApp may use the same strict cursor
// validation before forwarding cursor-only search parameters to the API.
export type AccountCursor = {createdAt:string;id:string};
export const accountPageLimits = {orders:30,tickets:200,requests:20} as const;
export const accountCursorKeys = ['orderCursor','ticketCursor','requestCursor'] as const;
type CursorKey = typeof accountCursorKeys[number];
export type AccountCursors = Partial<Record<CursorKey,AccountCursor>>;

function validTimestamp(value:unknown):value is string {
 if(typeof value!=='string')return false;
 const match=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}(?::\d{2})?)$/.exec(value);
 if(!match)return false;
 const [,year,month,day,hour,minute,second,zone]=match;
 const y=Number(year),m=Number(month),d=Number(day);
 const days=[31,y%4===0&&(y%100!==0||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
 if(y<1||m<1||m>12||d<1||d>days[m-1]||Number(hour)>23||Number(minute)>59||Number(second)>59)return false;
 if(zone==='Z')return true;
 const [zh,zm='0']=zone.slice(1).split(':');
 return Number(zh)<=14&&Number(zm)<=59&&(Number(zh)!==14||Number(zm)===0);
}
function validCursor(value:unknown):value is AccountCursor {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const cursor=value as AccountCursor;
 return Object.keys(value).length===2&&validTimestamp(cursor.createdAt)&&typeof cursor.id==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(cursor.id);
}
export function encodeAccountCursor(cursor:AccountCursor):string {
 if(!validCursor(cursor))throw Error('invalid_account_cursor');
 return btoa(JSON.stringify({createdAt:cursor.createdAt,id:cursor.id})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeAccountCursor(value:string):AccountCursor {
 if(!/^[A-Za-z0-9_-]{1,512}$/.test(value))throw Error('invalid_account_cursor');
 try {
  const raw=atob(value.replaceAll('-','+').replaceAll('_','/'));
  const cursor:unknown=JSON.parse(raw);
  if(!validCursor(cursor)||encodeAccountCursor(cursor)!==value)throw Error();
  return cursor;
 }catch{throw Error('invalid_account_cursor');}
}
export function readAccountCursors(params:URLSearchParams):AccountCursors {
 const cursors:AccountCursors={};
 for(const key of accountCursorKeys){
  if(params.getAll(key).length>1)throw Error('invalid_account_cursor');
  if(params.has(key))cursors[key]=decodeAccountCursor(params.get(key)!);
 }
 return cursors;
}
export function accountCursorQuery(params:URLSearchParams):string {
 const cursors=readAccountCursors(params),result=new URLSearchParams();
 for(const key of accountCursorKeys)if(cursors[key])result.set(key,encodeAccountCursor(cursors[key]!));
 return result.toString();
}
export function parseAccountQuery(params:URLSearchParams) {
 for(const key of params.keys())if(key!=='download'&&!accountCursorKeys.includes(key as CursorKey))throw Error('invalid_account_query');
 if(params.getAll('download').length>1||(params.has('download')&&params.get('download')!=='1'))throw Error('invalid_account_query');
 return {cursors:readAccountCursors(params),download:params.get('download')==='1'};
}
export function accountPage<T extends {created_at:string}>(rows:T[],limit:number,id:(row:T)=>string) {
 const items=rows.slice(0,limit),last=items[items.length-1];
 return {items,nextCursor:rows.length>limit&&last?encodeAccountCursor({createdAt:last.created_at,id:id(last)}):null};
}
export function accountPagination(cursors:AccountCursors,next:{orders:string|null;tickets:string|null;requests:string|null}) {
 const query=new URLSearchParams();
 for(const key of accountCursorKeys)if(cursors[key])query.set(key,encodeAccountCursor(cursors[key]!));
 const url=(params:URLSearchParams)=>'/account'+(params.size?'?'+params.toString():'');
 const stream=(key:CursorKey,limit:number,nextCursor:string|null)=>{
  const older=new URLSearchParams(query),first=new URLSearchParams(query);first.delete(key);
  if(nextCursor)older.set(key,nextCursor);
  return {limit,currentCursor:query.get(key),nextCursor,current:url(query),first:url(first),next:nextCursor?url(older):null};
 };
 const download=new URLSearchParams(query);download.set('download','1');
 return {exportScope:'page' as const,current:url(query),download:'/api/account?'+download.toString(),
  orders:stream('orderCursor',accountPageLimits.orders,next.orders),
  tickets:stream('ticketCursor',accountPageLimits.tickets,next.tickets),
  requests:stream('requestCursor',accountPageLimits.requests,next.requests)};
}
