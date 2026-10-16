/** Compose links only: opening these never claims a message was sent. */
export function whatsappUrl(input:string,text=''):string|null{
 const raw=String(input||'').trim();if(!raw||!/^[+\d\s().-]+$/.test(raw))return null;
 let digits=raw.replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(/^0[17]\d{8}$/.test(digits))digits='254'+digits.slice(1);
 else if(/^[17]\d{8}$/.test(digits))digits='254'+digits;
 if(!/^[1-9]\d{7,14}$/.test(digits))return null;
 return 'https://wa.me/'+digits+(text?'?text='+encodeURIComponent(text):'');
}
export function emailComposeLinks(input:string):{email:string;mailto:string;gmail:string}|null{
 const email=String(input||'').trim();
 if(email.length>254||!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}$/i.test(email))return null;
 return {email,mailto:'mailto:'+encodeURIComponent(email),gmail:'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)};
}
export function productCategories(values:string[]):string[]{return Array.from(new Set(['Apparel','Headwear','Accessories',...values].map(v=>v.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));}
export function clearSentReply(drafts:Record<string,string>,key:string,sent:string){if(drafts[key]!==sent)return drafts;const next={...drafts};delete next[key];return next;}
