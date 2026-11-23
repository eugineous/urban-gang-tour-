import type {NewsProvider,UrbanNewsBudget} from '@/lib/shared/urban-news';

/** A deliberately conservative per-dispatch allowance, not a price quotation. */
export const DEFAULT_NEWS_BUDGET:UrbanNewsBudget={
 monthlyLimitCents:500,reservedCents:0,revision:0,
 enabledProviders:{qwen:true,gemini:false,openai:false,nvidia:false}
};
export function reserveNewsDraftCents(provider:NewsProvider,model:string):number{
 if(provider==='qwen'&&model==='qwen-flash')return 2;
 if(provider==='qwen')return 25;
 if(provider==='gemini')return 25;
 if(provider==='openai'||provider==='nvidia')return 50;
 throw Error('invalid_news_provider');
}
export function validNewsBudget(value:unknown):value is Pick<UrbanNewsBudget,'monthlyLimitCents'|'enabledProviders'>{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const data=value as Record<string,unknown>,enabled=data.enabledProviders;
 if(typeof data.monthlyLimitCents!=='number'||!Number.isInteger(data.monthlyLimitCents)||data.monthlyLimitCents<300||data.monthlyLimitCents>500)return false;
 if(!enabled||typeof enabled!=='object'||Array.isArray(enabled))return false;
 const e=enabled as Record<string,unknown>,keys=Object.keys(e);
 return keys.every(k=>['qwen','gemini','openai','nvidia'].includes(k))&&(!Object.hasOwn(e,'nvidia')||typeof e.nvidia==='boolean')&&['qwen','gemini','openai'].every(k=>typeof e[k]==='boolean');
}
export function budgetAllows(usedCents:number,newReservationCents:number,limitCents:number):boolean{
 return [usedCents,newReservationCents,limitCents].every(n=>Number.isSafeInteger(n)&&n>=0)
  &&limitCents>=300&&limitCents<=500
  &&usedCents+newReservationCents<=limitCents;
}
