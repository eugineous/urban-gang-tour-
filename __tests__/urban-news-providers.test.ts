import {afterEach,expect,it,vi} from 'vitest';
import type {UrbanNewsDraft} from '@/lib/shared/urban-news';

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers()});
it('drops a credential-bearing discovery URL without losing the safe batch',async()=>{const api=await provider();vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({articles:[{url:'https://publisher.example/story?token=publisher-value',title:'Unsuitable URL',seendate:'20261117T100000Z'},{url:'https://publisher.example/safe',title:'Safe URL',seendate:'20261117T100000Z'}]}),{headers:{'Content-Type':'application/json'}}));expect((await api.fetchDiscoveredNews()).map(item=>item.url)).toEqual(['https://publisher.example/safe'])});
const evidence={id:'source-a',url:'https://artist.example/announcement',publisher:'Artist',title:'New release',observedAt:'2026-11-17T10:00:00Z',publishedAt:null,excerpt:'The artist announced an album called Night Garden for December. This independently prepared description is fixture evidence only.',rights:'public_facts' as const,role:'primary' as const,independenceKey:'artist',checked:true};
const draft:UrbanNewsDraft={headline:'Artist announces Night Garden',dek:'The album is expected in December.',body:['An artist has announced Night Garden, with a December release planned.'],category:'music',country:'Global',verification:'attributed',subjectKind:'public_figure',risk:'routine',evidence:[evidence],claims:[{text:'The artist announced Night Garden.',evidenceIds:['source-a']}],image:'',imageAlt:'',imageRights:'none',author:'Urban News',disclosure:'AI-assisted draft; editorial review required.'};
async function provider(){const value=await import('@/lib/server/urban-news-providers').catch(()=>null);expect(value,'provider adapters must exist').not.toBeNull();return value!}

it('bounds GDELT metadata, canonicalizes duplicate URLs and never treats images as licensed evidence',async()=>{
 const api=await provider();const fetcher=vi.fn(async()=>new Response(JSON.stringify({articles:[{url:'https://artist.example/story?utm_source=feed#top',title:'New album',domain:'artist.example',seendate:'20261117T100000Z',language:'English',sourcecountry:'Kenya',socialimage:'https://publisher.example/copyright.jpg'},{url:'https://artist.example/story',title:'Duplicate'},{url:'http://127.0.0.1/private',title:'Unsafe'}]}),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);
 const result=await api.fetchDiscoveredNews();expect(result).toHaveLength(1);expect(result[0]).toEqual({url:'https://artist.example/story',title:'New album',publisher:'artist.example',country:'Kenya',language:'English',observedAt:'2026-11-17T10:00:00.000Z',provider:'gdelt'});
 const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(new URL(url).origin+new URL(url).pathname).toBe('https://api.gdeltproject.org/api/v2/doc/doc');expect(new URL(url).searchParams.get('maxrecords')).toBe('50');expect(options.redirect).toBe('error');
});

it('rejects non-JSON and oversized discovery bodies with bounded errors',async()=>{
 const api=await provider();vi.stubGlobal('fetch',async()=>new Response('Please retry later',{headers:{'Content-Type':'text/html'}}));await expect(api.fetchDiscoveredNews()).rejects.toThrow('provider_non_json');
 vi.stubGlobal('fetch',async()=>new Response('x'.repeat(600000),{headers:{'Content-Type':'application/json'}}));await expect(api.fetchDiscoveredNews()).rejects.toThrow('provider_body_too_large');
 vi.stubGlobal('fetch',async()=>new Response('private key leaked upstream',{status:429}));await expect(api.fetchDiscoveredNews()).rejects.toThrow('provider_rate_limited');
});

it('keeps the body read inside the same deadline as headers',async()=>{
 const api=await provider();vi.useFakeTimers();vi.stubGlobal('fetch',async()=>new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'application/json'}}));
 const result=api.fetchDiscoveredNews().catch((e:Error)=>e.message);await vi.advanceTimersByTimeAsync(8001);expect(await result).toBe('provider_timeout');
});

it('sends source text only as untrusted evidence to fixed Gemini origin without tools or key URLs',async()=>{
 const api=await provider();let request:RequestInit|undefined;let target='';vi.stubGlobal('fetch',async(url:string,options:RequestInit)=>{target=url;request=options;return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({headline:draft.headline,dek:draft.dek,body:draft.body,category:'music',country:'Global',verification:'attributed',subjectKind:'public_figure',risk:'routine',claims:draft.claims})}]},safetyRatings:[]}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:80}}),{headers:{'Content-Type':'application/json'}})});
 const result=await api.draftFromEvidence('gemini','gemini-3.5-flash-lite','fixture-provider-secret',draft);expect(result.draft.evidence).toEqual([evidence]);expect(result.draft.imageRights).toBe('none');expect(result.draft.claims[0].evidenceIds).toEqual(['source-a']);expect(target).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');expect(target).not.toContain('fixture-provider-secret');const payload=JSON.parse(String(request?.body));expect(payload.tools).toBeUndefined();expect(payload.systemInstruction.parts[0].text).toContain('untrusted');expect(payload.contents[0].parts[0].text).toContain('source-a');expect(payload.contents[0].parts[0].text).not.toContain('fixture-provider-secret');
});

it('refuses arbitrary model paths and unknown evidence IDs without accepting model approval labels',async()=>{
 const api=await provider();const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(api.draftFromEvidence('gemini','../../malicious','key',draft)).rejects.toThrow('invalid_news_model');expect(fetcher).not.toHaveBeenCalled();
 vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...draft,claims:[{text:'Invented',evidenceIds:['invented']}]})}}]}),{headers:{'Content-Type':'application/json'}}));await expect(api.draftFromEvidence('openai','gpt-4.1-mini','key',draft)).rejects.toThrow('provider_evidence_invalid');
});

it('holds copied text and unsafe model completion instead of treating them as a usable draft',async()=>{
 const api=await provider();vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY',content:{parts:[{text:JSON.stringify(draft)}]}}]}),{headers:{'Content-Type':'application/json'}}));await expect(api.draftFromEvidence('gemini','gemini-3.5-flash-lite','key',draft)).rejects.toThrow('provider_finish_unsafe');
 vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({headline:draft.headline,dek:draft.dek,body:[evidence.excerpt],category:'music',country:'Global',verification:'attributed',subjectKind:'public_figure',risk:'routine',claims:draft.claims})}]}}]}),{headers:{'Content-Type':'application/json'}}));await expect(api.draftFromEvidence('gemini','gemini-3.5-flash-lite','key',draft)).rejects.toThrow('provider_copying_detected');
});
it('rejects extra generated fields and cannot downgrade input sensitive reporting or invent confirmed verification',async()=>{
 const api=await provider();const output={headline:draft.headline,dek:draft.dek,body:draft.body,category:'music',country:'Global',verification:'confirmed',subjectKind:'public_figure',risk:'routine',claims:draft.claims};
 const reply=(value:unknown)=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}),{headers:{'Content-Type':'application/json'}});
 vi.stubGlobal('fetch',async()=>reply({...output,approved:true}));await expect(api.draftFromEvidence('gemini','gemini-3.5-flash-lite','key',draft)).rejects.toThrow('provider_output_invalid');
 vi.stubGlobal('fetch',async()=>reply(output));const result=await api.draftFromEvidence('gemini','gemini-3.5-flash-lite','key',{...draft,risk:'sensitive',verification:'developing'});expect(result.draft).toMatchObject({risk:'sensitive',verification:'developing'});
});
it('accepts unblocked Gemini prompt feedback and OpenAI JSON without allowing model coverage changes',async()=>{
 const api=await provider(),output={headline:draft.headline,dek:draft.dek,body:draft.body,category:'music',country:'CN',verification:'attributed',subjectKind:'public_figure',risk:'routine',claims:draft.claims};
 vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({promptFeedback:{safetyRatings:[]},candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]}),{headers:{'Content-Type':'application/json'}}));expect((await api.draftFromEvidence('gemini','gemini-3.5-flash-lite','fixture-key',{...draft,country:'KE'})).draft.country).toBe('KE');
 const fetcher=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}],usage:{prompt_tokens:20,completion_tokens:30}}),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);const result=await api.draftFromEvidence('openai','gpt-4.1-mini','fixture-openai-key',draft);expect(result.usage).toEqual({inputTokens:20,outputTokens:30});const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe('https://api.openai.com/v1/chat/completions');expect(JSON.parse(String(options.body)).tools).toBeUndefined();expect(result.draft.country).toBe('Global');
});

const qwenOutput=()=>({headline:draft.headline,dek:draft.dek,body:draft.body,category:'music',country:'Global',verification:'attributed',subjectKind:'public_figure',risk:'routine',claims:draft.claims});
it('routes Qwen only to the fixed Singapore application endpoint with bounded non-thinking structured text',async()=>{
 const api=await provider(),fetcher=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(qwenOutput())}}],usage:{prompt_tokens:120,completion_tokens:180}}),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);
 const result=await api.draftFromEvidence('qwen','qwen3.8-flash','fixture-qwen-private-key-123456',draft);
 const [url,request]=fetcher.mock.calls[0] as unknown as [string,RequestInit],body=JSON.parse(String(request.body));
 expect(url).toBe('https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1/chat/completions');expect(new Headers(request.headers).get('Authorization')).toBe('Bearer fixture-qwen-private-key-123456');
 expect(body).toMatchObject({model:'qwen3.8-flash',enable_thinking:false,max_tokens:4500,response_format:{type:'json_schema',json_schema:{name:'urban_news_draft',strict:true}}});expect(body.tools).toBeUndefined();expect(body.max_completion_tokens).toBeUndefined();expect(body.messages[0].content).toContain('untrusted');expect(JSON.stringify(body)).not.toContain('fixture-qwen-private-key');expect(url).not.toContain('fixture-qwen-private-key');expect(result.usage).toEqual({inputTokens:120,outputTokens:180});expect(result.draft.evidence).toEqual([evidence]);expect(result.draft.imageRights).toBe('none');
});
it('does not retry or accept truncated, refused, or tool-directed Qwen completions',async()=>{
 const api=await provider();for(const choice of [{finish_reason:'length',message:{content:JSON.stringify(qwenOutput())}},{finish_reason:'stop',message:{content:JSON.stringify(qwenOutput()),tool_calls:[{name:'publish'}]}},{finish_reason:'stop',message:{content:JSON.stringify(qwenOutput()),refusal:'held'}}]){const fetcher=vi.fn(async()=>new Response(JSON.stringify({choices:[choice]}),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);await expect(api.draftFromEvidence('qwen','qwen3.8-flash','fixture-qwen-key',draft)).rejects.toThrow('provider_finish_unsafe');expect(fetcher).toHaveBeenCalledTimes(1)}
});
it('retains the single Qwen deadline through a stalled body and leaves uncertain dispatch unretried',async()=>{
 const api=await provider();vi.useFakeTimers();const fetcher=vi.fn(async()=>new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);const result=api.draftFromEvidence('qwen','qwen3.8-flash','fixture-qwen-key',draft).catch((error:Error)=>error.message);await vi.advanceTimersByTimeAsync(8001);expect(await result).toBe('provider_timeout');expect(fetcher).toHaveBeenCalledTimes(1);
});

it('checks the Kenyan chart identity and freshness before preparing attributed evidence',async()=>{
 const api=await provider();
 const track={id:'123',artistName:'Act',name:'Title',kind:'songs',url:'https://music.apple.com/ke/album/a/321?i=123'};
 const feed={id:api.KENYA_CHART_URL,country:'ke',updated:new Date().toISOString(),results:[track]};
 vi.stubGlobal('fetch',async()=>Response.json({feed}));
 expect(await api.fetchKenyaMusicLead()).toMatchObject({provider:'apple_chart',country:'KE',url:track.url});
 feed.updated='2020-01-01';await expect(api.fetchKenyaMusicLead()).rejects.toThrow('provider_output_invalid');
});
it('keeps NVIDIA credentials on its own endpoint and distinguishes rejected credentials',async()=>{
 const api=await provider(),fetcher=vi.fn(async()=>new Response('',{status:401}));vi.stubGlobal('fetch',fetcher);
 await expect(api.draftFromEvidence('nvidia','nvidia/nemotron-3.5-lightning-30b-a3b','fixture-nvidia-key',draft)).rejects.toThrow('provider_auth_rejected');
 expect(fetcher).toHaveBeenCalledWith('https://integrate.api.nvidia.com/v1/chat/completions',expect.objectContaining({redirect:'error'}));
});
it('checks saved Qwen access without generating or sending a prompt',async()=>{
 const api=await provider(),fetcher=vi.fn(async()=>Response.json({data:[{id:'qwen-flash'}]}));vi.stubGlobal('fetch',fetcher);
 expect(await api.checkNewsProviderModel('qwen','qwen-flash','fixture-only')).toBe('private_catalogue');
 expect(fetcher).toHaveBeenCalledWith('https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1/models',expect.objectContaining({method:'GET',headers:{Accept:'application/json',Authorization:'Bearer fixture-only'}}));
});
