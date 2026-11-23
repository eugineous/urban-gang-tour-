import type {NewsPreferences} from './news-preferences';
export type NewsRankReason='home_market'|'followed_market'|'topic'|'global'|'confirmed'|'recent'|'latest'|'diversity';
export type RankableNews={slug?:string;id?:string;headline:string;section?:string;newsCountry?:string;newsVerification?:string;datePublished?:string;date?:string;published?:boolean;status?:string};

/** Explicit inputs only. The caller must supply the existing eligible public DTOs. */
export function rankPublicNews<T extends RankableNews>(items:readonly T[],prefs:NewsPreferences,now:number):{item:T;reasons:NewsRankReason[]}[]{
 const seen=new Set<string>();
 const ranked=items.flatMap(item=>{
  const id=item.slug||item.id,time=Date.parse(item.datePublished||item.date||'');
  if(!id||seen.has(id)||item.published===false||item.status&&item.status!=='published'||!Number.isFinite(time)||time>now)return [];
  seen.add(id);const country=item.newsCountry||'',reasons:NewsRankReason[]=[];let score=0;
  if(country===prefs.homeMarket){score+=30;reasons.push('home_market')}
  else if(prefs.followedMarkets.includes(country as never)){score+=20;reasons.push('followed_market')}
  if(prefs.topics.includes(item.section as never)){score+=10;reasons.push('topic')}
  if(country==='Global'){score+=5;reasons.push('global')}
  if(item.newsVerification==='confirmed'){score+=10;reasons.push('confirmed')}
  else if(item.newsVerification==='attributed')score+=6;
  const age=Math.max(0,now-time);score+=12*Math.exp(-age/(7*86400000));if(age<2*86400000)reasons.push('recent');
  if(!reasons.length)reasons.push('latest');
  return [{item,reasons,score,time,id,country,category:item.section||''}];
 }).sort((a,b)=>b.score-a.score||b.time-a.time||a.id.localeCompare(b.id));
 const output:typeof ranked=[];
 while(ranked.length&&output.length<24){
  const lastCountry=output.slice(-4),lastTopic=output.slice(-3);
  const country=lastCountry.length===4&&lastCountry.every(row=>row.country===lastCountry[0].country)?lastCountry[0].country:null;
  const topic=lastTopic.length===3&&lastTopic.every(row=>row.category===lastTopic[0].category)?lastTopic[0].category:null;
  let index=country!==null||topic!==null?ranked.findIndex(row=>(country===null||row.country!==country)&&(topic===null||row.category!==topic)):0;
  if(index<0&&country!==null)index=ranked.findIndex(row=>row.country!==country);
  if(index<0)index=0;
  const [next]=ranked.splice(index,1);if(index>0)next.reasons=[...next.reasons,'diversity'];output.push(next);
 }
 return output.concat(ranked).map(({item,reasons})=>({item,reasons}));
}

/** A missing-coverage fallback means literal newest-first, not weighted ranking. */
export function selectNewsEdition<T extends RankableNews>(items:readonly T[],prefs:NewsPreferences,now:number){
 const ranked=rankPublicNews(items,prefs,now);
 const matchingCoverage=ranked.some(row=>row.reasons.some(reason=>reason==='home_market'||reason==='followed_market'||reason==='topic'));
 if(matchingCoverage)return{ranked,matchingCoverage};
 return{matchingCoverage,ranked:ranked.sort((a,b)=>Date.parse(b.item.datePublished||b.item.date||'')-Date.parse(a.item.datePublished||a.item.date||'')||(a.item.slug||a.item.id||'').localeCompare(b.item.slug||b.item.id||'')).map(row=>({item:row.item,reasons:['latest'] as NewsRankReason[]}))};
}
