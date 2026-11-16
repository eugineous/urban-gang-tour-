/** Account identifiers only. Never strip Gmail dots/plus tags or infer a person. */
export function normalizeCustomerPhone(value:string):string|null{
 if(typeof value!=='string'||value.length>40)return null;
 const compact=value.replace(/[\s()-]/g,'');
 if(!/^(?:0|\+?254)[71]\d{8}$/.test(compact))return null;
 return '+254'+compact.replace(/^(?:0|\+?254)/,'');
}
export function normalizeCustomerEmail(value:string):string|null{
 if(typeof value!=='string')return null;
 const email=value.trim().toLowerCase();
 return email.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?email:null;
}
