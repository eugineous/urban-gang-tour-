import type {DiscoveredNews} from '@/lib/shared/urban-news';
import bundledFeeds from '../../data/urban-news-feeds.json';
import kenyaSnapshot from '../../data/urban-news-kenya-chart.json';
import {cached} from './microcache';
import {canonicalNewsUrl} from './urban-news-policy';

type Publisher = {url:string; name:string; language?:string; hosts?:string[]; mixed?:boolean};
const publishers:Record<string,Publisher> = {
  KE:{url:'https://www.standardmedia.co.ke/rss/entertainment.php',name:'The Standard Entertainment',hosts:['www.standardmedia.co.ke','www.tnx.africa']},
  UG:{url:'https://www.matookerepublic.com/category/entertainment/feed/',name:'Matooke Republic'},
  TZ:{url:'https://bongo5.com/feed/',name:'Bongo5',language:'Swahili'},
  SO:{url:'https://sntv.so/feed/',name:'Somali National Television',language:'Somali',mixed:true},
  GB:{url:'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',name:'BBC News',hosts:['www.bbc.co.uk','www.bbc.com']},
  US:{url:'https://variety.com/feed/',name:'Variety'},
  SE:{url:'https://kingsizemag.se/feed/',name:'Kingsize Magazine',language:'Swedish'},
  NL:{url:'https://3voor12.vpro.nl/rss.xml',name:'VPRO 3voor12',language:'Dutch'},
  KZ:{url:'https://astanatimes.com/category/culture/feed/',name:'The Astana Times'},
  IN:{url:'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms',name:'The Times of India'},
  NG:{url:'https://notjustok.com/feed/',name:'NotJustOk'},
  ZA:{url:'https://texxandthecity.com/feed/',name:'Texx and the City'},
  GH:{url:'https://newsghana.com.gh/entertainment/feed/',name:'News Ghana'},
  RW:{url:'https://www.ktpress.rw/feed/',name:'KT Press',mixed:true},
};
// GDELT DOC uses FIPS country codes for publisher geography.
const gdeltMarkets:Record<string,[string,string]> = {
  KE:['KE','Kenya'], UG:['UG','Uganda'], TZ:['TZ','Tanzania'], SO:['SO','Somalia'],
  GB:['UK','United Kingdom'], US:['US','United States'], SE:['SW','Sweden'], NL:['NL','Netherlands'],
  KZ:['KZ','Kazakhstan'], IN:['IN','India'], NG:['NI','Nigeria'], ZA:['SF','South Africa'],
  GH:['GH','Ghana'], RW:['RW','Rwanda'],
};
const worldRotation=['BR','JP','FR','MX','PH','DE','AU','CA','KR','CO','JM','ID','IT','ES','TR','MY'];
const regionNames=new Intl.DisplayNames(['en'],{type:'region',fallback:'none'});
const hour=3600000;
const entertainment=/\b(?:albums?|songs?|music(?:ian)?s?|concerts?|festivals?|films?|movies?|actors?|actresses?|artists?|singers?|fashion|cinema|dancers?|comedy|entertainment|fannaan\w*|hees\w*|muusig\w*|filim\w*|fanka|theat[er]+|filmmakers?|hees(?:ta|aha)?|fannaan\w*|fanaan\w*|fanka|fankaanka|muusig\w*|bandhig(?:ga)?|filim\w*)\b/i;
const sensitive=/\b(?:politic\w*|elections?|president\w*|prime minister|parliament\w*|ministers?|senators?|government|campaign rally|police|courts?|arrest\w*|accus\w*|alleg\w*|assault\w*|abus\w*|shooting|gunman|kill\w*|murder\w*|terror\w*|kidnap\w*|suicid\w*|death|dies|died|dead|funeral|wars?|genocide|rape|rapist|fraud|charged|criminal|convicted|lawsuit|overdose|uchaguzi|siasa|rais|polisi|mauaji|ubakaji|serikali|overleden|politie|verkiezingen|regering|moord|misbruik|mord|polis|regeringen|våldtäkt|siyaasad\w*|ciidan\w*|madaxweynaha|dowlad\w*|dagaal\w*|dil\w*|boolis\w*|weerar\w*|xukuumad\w*)\b/i;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fresh=(date:number,maxAge:number)=>Number.isFinite(date)&&date<=Date.now()+60000&&date>=Date.now()-maxAge;
const clean=(value:unknown,max:number):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=max&&!/[<>\u0000-\u001f\u007f]/u.test(value);
function attribution(value:unknown) {
  try { return new URL(canonicalNewsUrl(value)); } catch { return null; }
}

export function eligibleGlobalNewsLead(lead:DiscoveredNews):boolean {
  return typeof lead.title==='string'&&entertainment.test(lead.title)&&!sensitive.test(lead.title)&&fresh(Date.parse(lead.observedAt),72*hour);
}

export function marketChartUrl(country:string):string {
  if(!/^[A-Z]{2}$/.test(country)||!regionNames.of(country))throw Error('invalid_news_market');
  return 'https://rss.marketingtools.apple.com/api/v2/'+country.toLowerCase()+'/music/most-played/10/songs.json';
}

// Vendor order is authoritative. Preserve original array indices when an invalid row is skipped.
function chartRows(payload:unknown,country:string,leadOnly=false):DiscoveredNews[] {
  if(!object(payload)||!object(payload.feed))return [];
  const {id,country:storefront,updated,results}=payload.feed;
  const observed=typeof updated==='string'?Date.parse(updated):NaN;
  if(id!==marketChartUrl(country)||storefront!==country.toLowerCase()||!fresh(observed,48*hour)||!Array.isArray(results)||results.length>10)return [];
  return (leadOnly?results.slice(0,1):results).flatMap((row,index)=>{
    if(!object(row)||row.kind!=='songs'||!clean(row.artistName,120)||!clean(row.name,160)||typeof row.id!=='string'||!/^\d{1,24}$/.test(row.id))return [];
    const url=attribution(row.url);
    if(!url||url.hostname!=='music.apple.com'||!url.pathname.startsWith('/'+storefront+'/album/')||url.searchParams.size!==1||url.searchParams.get('i')!==row.id)return [];
    const track=row.artistName.trim()+'’s “'+row.name.trim()+'”';
    const title=leadOnly?track+' leads Apple Music’s Kenya songs chart':track+' ranks No. '+(index+1)+' on Apple Music’s '+regionNames.of(country)+' songs chart';
    return [{title,url:url.href,country,publisher:'Apple Music',language:'English',observedAt:new Date(observed).toISOString(),provider:leadOnly?'apple_chart':'market_chart'}];
  });
}

const mirror='https://raw.githubusercontent.com/eugineous/urban-gang-tour-/urban-news-feeds/feeds.json';
type SourceArchive={charts:Record<string,unknown>;press:Record<string,unknown>};
async function feedArchive():Promise<SourceArchive>{
 return cached('urban-news:source-archive',15*60_000,async()=>{
  const data:unknown=JSON.parse(await readFeed(mirror,'json'));
  if(!object(data)||!object(data.charts)||!object(data.press))throw Error('provider_output_invalid');
  return {charts:data.charts,press:data.press};
 }).catch(()=>bundledFeeds);
}
export async function archivedChart(country:string):Promise<unknown>{
 const live=(await feedArchive()).charts[country];
 return chartRows(live,country).length?live:(bundledFeeds.charts as Record<string,unknown>)[country];
}

/** Fetch current, first-party song rankings for the unattended chart template only. */
export async function fetchAutomaticChartRows(country:string):Promise<DiscoveredNews[]> {
  const endpoint=marketChartUrl(country);
  const direct=await readFeed(endpoint,'json').then(data=>chartRows(JSON.parse(data),country)).catch(()=>[]);
  const rows=direct.length?direct:chartRows(await archivedChart(country),country);
  return rows.filter(row=>{
    const url=new URL(row.url);
    return new RegExp('^/'+country.toLowerCase()+'/album/[^/]+/[0-9]+$').test(url.pathname)
      && !sensitive.test(row.title) && !/[\p{Cf}“”]/u.test(row.title.replace('“','').replace('”',''));
  });
}

// Video records are links for editorial discovery only. The song chart evidence path
// intentionally applies only to songs.
async function musicVideoRows(country:string):Promise<DiscoveredNews[]> {
  const endpoint=marketChartUrl(country).replace('/songs.json','/music-videos.json');
  const payload:unknown=JSON.parse(await readFeed(endpoint,'json'));
  if(!object(payload)||!object(payload.feed))return [];
  const {id,country:storefront,updated,results}=payload.feed;
  const observed=typeof updated==='string'?Date.parse(updated):NaN;
  if(id!==endpoint||storefront!==country.toLowerCase()||!fresh(observed,48*hour)||!Array.isArray(results)||results.length>10)return [];
  return results.flatMap((row):DiscoveredNews[]=>{
    if(!object(row)||row.kind!=='music-videos'||!clean(row.artistName,120)||!clean(row.name,160)||typeof row.id!=='string'||!/^\d{1,24}$/.test(row.id))return [];
    const url=attribution(row.url);
    if(!url||url.hostname!=='music.apple.com'||!url.pathname.startsWith('/'+storefront+'/music-video/')||!url.pathname.endsWith('/'+row.id)||url.search)return [];
    const title=row.artistName.trim()+' — '+row.name.trim()+' (music video)';
    if(sensitive.test(title))return [];
    return [{title,url:url.href,publisher:'Apple Music',country,language:'English',observedAt:new Date(observed).toISOString(),provider:'publisher_feed'}];
  });
}

/** The bundled first-party snapshot expires 48 hours after Apple's update time. */
export async function fetchKenyaChartBackup():Promise<DiscoveredNews> {
  const lead=chartRows(kenyaSnapshot,'KE',true)[0];
  if(!lead)throw Error('provider_output_invalid');
  return lead;
}

// All callers supply fixed provider origins. Never resolve an article link or follow redirects.
async function readFeed(url:string,format:'xml'|'json'):Promise<string> {
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),4500);
  try {
    const response=await fetch(url,{signal:abort.signal,cache:'no-store',redirect: 'manual',headers:{Accept:format==='xml'?'application/rss+xml, application/atom+xml, application/xml, text/xml':'application/json'}});
    const mime=response.headers.get('content-type')??'';
    const allowed=format==='xml'?/^(?:application\/(?:rss\+xml|atom\+xml|xml)|text\/xml)\b/i:/^application\/json\b/i;
    const limit=512*1024;
    if(!response.ok||!(allowed.test(mime)||url===mirror&&/^text\/plain\b/i.test(mime))||Number(response.headers.get('content-length')??0)>limit||!response.body)throw Error('provider_unavailable');
    const reader=response.body.getReader();
    const decoder=new TextDecoder('utf-8',{fatal:true});
    let size=0,body='';
    try {
      while(true){
        const chunk=await reader.read();
        if(chunk.done)return body+decoder.decode();
        size+=chunk.value.byteLength;
        if(size>limit)throw Error('provider_body_too_large');
        body+=decoder.decode(chunk.value,{stream:true});
      }
    } finally {reader.releaseLock();}
  } finally {clearTimeout(timer);abort.abort();}
}

function unescapeXml(text:string):string {
  const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  return text.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-f]{1,6}|#\d{1,7});/gi,(original,key:string)=>{
    if(key[0]!=='#')return named[key]??original;
    const cp=key[1]==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
    return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):'';
  });
}

// Extract direct RSS item fields only. Article bodies, comments, and markup inside CDATA
// never become new elements. No DTDs, external entities, media downloads or HTML rendering.
type PressHeadline=DiscoveredNews&{artwork?:{url:string;license:string}};
function rssRows(xml:string,source:Publisher,country:string,includeArtwork=false):PressHeadline[] {
  if(/<!DOCTYPE/i.test(xml))return [];
  const rows:PressHeadline[]=[],stack:string[]=[];
  const hosts=source.hosts??[new URL(source.url).hostname];
  let fields:Record<string,string>={};
  let mediaUrl='', license='', artwork:PressHeadline['artwork'];
  const mediaRss=includeArtwork&&/<rss\b[^>]*\sxmlns:media=["']http:\/\/search\.yahoo\.com\/mrss\/["']/i.test(xml);
  const attr=(tag:string,name:string)=>new RegExp('\\s'+name+'=["\x27]([^"\x27<>]*)["\x27]').exec(tag)?.[1]??'';

  for(const [token] of xml.matchAll(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)){
    if(token.startsWith('<?')||token.startsWith('<!--'))continue;
    if(token.startsWith('<')&&!token.startsWith('<![CDATA[')){
      const name=/^<\/?([\w:.-]+)/.exec(token)?.[1];
      if(!name)return [];
      if(token.startsWith('</')){
        if(stack.pop()!==name)return [];
        if(name==='media:content'&&stack.join('/')==='rss/channel/item'){
          if(mediaUrl&&license)artwork={url:mediaUrl,license};
          mediaUrl='';license='';
        }
        if(name==='item'&&stack.join('/')==='rss/channel'){
          const {title,link,pubDate}=fields;
          const url=attribution(link?.trim());
          const headline=title?.trim().replace(/\s+/g,' ');
          if(clean(headline,300)&&!sensitive.test(headline)&&(!source.mixed||entertainment.test(headline))&&url&&hosts.includes(url.hostname)&&fresh(Date.parse(pubDate),7*24*hour)){
            rows.push({...(artwork?{artwork}:{}),url:url.href,title:headline,publishedAt:new Date(pubDate).toISOString(),publisher:source.name,country,language:source.language??'English',observedAt:new Date().toISOString(),provider:'publisher_feed'});
          }
          fields={};artwork=undefined;
          if(rows.length>=30)break;
        }
      }else{
        if(mediaRss&&name==='media:content'&&stack.join('/')==='rss/channel/item'){
          const image=attribution(unescapeXml(attr(token,'url')));
          mediaUrl=image&&image.protocol==='https:'&&hosts.includes(image.hostname)&&/^image\/(jpeg|png|webp)$/.test(attr(token,'type'))?image.href:'';
          license='';
        }else if(mediaUrl&&name==='media:license'&&stack.join('/')==='rss/channel/item/media:content'){
          const href=attr(token,'href');
          if(/^https:\/\/creativecommons\.org\/publicdomain\/(?:zero|mark)\/1\.0\/$/.test(href))license=href;
        }
        if(token.endsWith('/>'))continue;
        stack.push(name);
        if(stack.length>40)return [];
      }
    }else if(stack.length===4&&stack[0]==='rss'&&stack[1]==='channel'&&stack[2]==='item'&&['title','link','pubDate'].includes(stack[3])){
      const key=stack[3];
      const value=token.startsWith('<![CDATA[')?token.slice(9,-3):unescapeXml(token);
      fields[key]=(fields[key]??'')+value;
    }
  }
  return rows;
}

// Read public uploads from a named music publisher. The feed supplies metadata only.
async function publicMusicVideoLeads():Promise<DiscoveredNews[]>{
  const channel='UC4eYXhJI4-7wSWc8UNRwD4A';
  const xml=await readFeed('https://www.youtube.com/feeds/videos.xml?channel_id='+channel,'xml');
  if(/<!DOCTYPE/i.test(xml))return [];
  const rows:DiscoveredNews[]=[],stack:string[]=[];
  let fields:Record<string,string>={};
  for(const [token] of xml.matchAll(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)){
    if(token.startsWith('<?')||token.startsWith('<!--'))continue;
    if(token.startsWith('<')&&!token.startsWith('<![CDATA[')){
      const name=/^<\/?([\w:.-]+)/.exec(token)?.[1];if(!name)return [];
      if(token.startsWith('</')){
        if(stack.pop()!==name)return [];
        if(name==='entry'&&stack.join('/')==='feed'){
          const title=fields.title?.trim(),id=fields['yt:videoId'];
          if(fields['yt:channelId']===channel&&/^[\w-]{11}$/.test(id??'')&&clean(title,300)&&!sensitive.test(title)&&fresh(Date.parse(fields.published),7*24*hour))
            rows.push({title,url:'https://www.youtube.com/watch?v='+id,country:'US',language:'English',publisher:'NPR Music',observedAt:new Date().toISOString(),provider:'publisher_feed'});
          fields={};
        }
      }else if(!token.endsWith('/>')){stack.push(name);if(stack.length>40)return []}
    }else if(stack.length===3&&stack[0]==='feed'&&stack[1]==='entry'&&['title','yt:channelId','yt:videoId','published'].includes(stack[2])){
      const field=stack[2];fields[field]=(fields[field]??'')+(token.startsWith('<![CDATA[')?token.slice(9,-3):unescapeXml(token));
    }
  }
  return rows;
}

async function gdeltRows(country:string):Promise<DiscoveredNews[]> {
  const market=gdeltMarkets[country];
  if(!market)return [];
  const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.search=new URLSearchParams({query:'(music OR cinema OR concert OR film OR fashion OR entertainment) sourcecountry:'+market[0]+' -politics -election -crime',mode:'artlist',format:'json',maxrecords:'25',sort:'datedesc',timespan:'3d'}).toString();
  const payload:unknown=JSON.parse(await readFeed(url.href,'json'));
  if(!object(payload)||!Array.isArray(payload.articles))return [];
  return payload.articles.slice(0,25).flatMap((row):DiscoveredNews[]=>{
    if(!object(row)||row.sourcecountry!==market[1]||!clean(row.title,300)||!entertainment.test(row.title)||sensitive.test(row.title))return [];
    const link=attribution(row.url);
    const parts=typeof row.seendate==='string'&&/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(row.seendate);
    if(!parts||!link)return [];
    const seen=Date.parse(parts[1]+'-'+parts[2]+'-'+parts[3]+'T'+parts[4]+':'+parts[5]+':'+parts[6]+'Z');
    if(!fresh(seen,7*24*hour))return [];
    return [{title:row.title,url:link.href,publisher:link.hostname,country,language:clean(row.language,30)?row.language:'Unknown',observedAt:new Date(seen).toISOString(),provider:'gdelt'}];
  });
}

function unique(groups:DiscoveredNews[][],target:number):DiscoveredNews[] {
  const seen=new Set<string>(),titles=new Set<string>(),out:DiscoveredNews[]=[];
  for(const row of groups.flat()){
    const title=row.title.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    if(seen.has(row.url)||titles.has(title))continue;
    seen.add(row.url);titles.add(title);out.push(row);
    if(out.length===target)break;
  }
  return out;
}

/** At most four allowlisted requests per call, in two waves of up to two. */
export async function discoverMarketSources(country:string,target:number):Promise<DiscoveredNews[]> {
  if(!Number.isFinite(target)||target<1)return [];
  const limit=Math.min(50,Math.floor(target));
  const day=Math.floor(Date.now()/(24*hour));
  const global=country==='Global';
  const market=global?worldRotation[day%worldRotation.length]:country;
  const feedCountry=global?(day%2?'GB':'US'):country;
  if(!/^[A-Z]{2}$/.test(market)||!regionNames.of(market))return [];
  const source=publishers[feedCountry];
  const [rss,chart]=await Promise.all([
    source?readFeed(source.url,'xml').then(xml=>rssRows(xml,source,feedCountry)).catch(()=>[]):[],
    readFeed(marketChartUrl(market),'json').then(body=>chartRows(JSON.parse(body),market)).catch(()=>[]),
  ]);
  const chartCandidates=market==='KE'&&!chart.length?chartRows(kenyaSnapshot,market):chart;
  // Give small batches both a local headline and a verifiable ranking when available.
  const preferred=global?[chartCandidates.slice(0,1),rss.slice(0,1)]:[rss.slice(0,1),chartCandidates.slice(0,1)];
  const rows=unique([...preferred,rss,chartCandidates],limit);
  const [videos,reports]=await Promise.all([
    global||market==='US'?publicMusicVideoLeads().catch(()=>[]):market==='SO'&&rows.length<limit?
      readFeed('https://feeds.bbci.co.uk/somali/rss.xml','xml').then(xml=>rssRows(xml,{name:'BBC Somali',url:'https://feeds.bbci.co.uk/somali/rss.xml',hosts:['www.bbc.com','www.bbc.co.uk'],language:'Somali',mixed:true},'SO')).catch(()=>[]):
      limit>=3&&market!=='SO'?musicVideoRows(market).catch(()=>[]):[],
    rows.length<limit?gdeltRows(feedCountry).catch(()=>[]):[],
  ]);
  return unique([...preferred,videos.slice(0,1),rows,reports,videos],limit);
}

/** Read only headlines and links that a named publisher includes in its public feed. */
export async function readPublisherHeadlines(country?:string):Promise<PressHeadline[]> {
  const markets=country?[country]:['KE','UG','NG','GB'];
  const groups=await Promise.all(markets.map(async market=>{
    if(!Object.hasOwn(publishers,market))return [];
    const source=publishers[market];
    const rows=await cached('news:public-rss:'+market,30*60_000,async()=>{
      let items=await readFeed(source.url,'xml').then(xml=>rssRows(xml,source,market,true)).catch(()=>[]);
      if(!items.length){
        const xml=(await feedArchive()).press[market];
        if(typeof xml==='string')items=rssRows(xml,source,market);
        if(!items.length){
          const offline=(bundledFeeds.press as Record<string,string>)[market];
          if(offline)items=rssRows(offline,source,market);
        }
      }
      return items.sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0,5);
    }).catch(()=>[]);
    return rows.filter(row=>fresh(Date.parse(row.publishedAt??''),72*hour));
  }));
  const balanced=Array.from({length:5},(_,index)=>groups.flatMap(group=>group[index]?[group[index]]:[]));
  return unique(balanced,6);
}
