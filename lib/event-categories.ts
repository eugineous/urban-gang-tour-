export type EventCategory={id:string;name:string;active:boolean;version:number};
export type EventCategoryInput={action:'create';name:string}|{action:'update';id:string;name:string;active:boolean;version:number};
export function categoryName(value:unknown):string|null{
 if(typeof value!=='string'||/[\u0000-\u001f\u007f]/.test(value))return null;
 const name=value.trim().replace(/\s+/g,' ');
 return name.length>0&&name.length<=80?name:null;
}
export function categoryId(value:unknown):value is string{return typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,59}$/.test(value)}
export function publicEventCategory(value:unknown):{id:string;name:string}|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const row=value as Record<string,unknown>,name=categoryName(row.name);
 return categoryId(row.id)&&name?{id:row.id,name}:null;
}
export function parseEventCategory(value:Record<string,unknown>):EventCategoryInput|null{
 const name=categoryName(value.name);if(!name)return null;
 if(value.action==='create'&&Object.keys(value).every(key=>['action','name'].includes(key)))return {action:'create',name};
 if(value.action==='update'&&Object.keys(value).every(key=>['action','id','name','active','version'].includes(key))&&categoryId(value.id)&&typeof value.active==='boolean'&&Number.isSafeInteger(value.version)&&Number(value.version)>0)return {action:'update',id:value.id,name,active:value.active,version:Number(value.version)};
 return null;
}
