import type {NewsProvider} from './urban-news';

/** Local prefix recognition. Generic sk- keys are used by multiple vendors. */
export function detectNewsProvider(key:string):NewsProvider|null {
 if(key.startsWith('nvapi-'))return 'nvidia';
 if(key.startsWith('AIza')||key.startsWith('AQ.'))return 'gemini';
 if(key.startsWith('sk-ws-')||key.startsWith('sk-sp-'))return 'qwen';
 if(/^sk-(?:proj|svcacct)-/.test(key))return 'openai';
 return null;
}

export function validNewsProviderKey(provider:NewsProvider,key:unknown):key is string {
 if(typeof key!=='string'||key.length<20||key.length>4096||!/^[A-Za-z0-9_./+=-]+$/.test(key)||/(?:\.{3}|x{8})/i.test(key))return false;
 if(/^sk-(?:ant-|or-|admin-|sp-)/.test(key))return false;
 const detected=detectNewsProvider(key);
 if(detected&&detected!==provider)return false;
 if(key.startsWith('AIza'))return /^AIza[\w-]{35}$/.test(key);
 if(key.startsWith('sk-'))return provider==='openai'||provider==='qwen';
 return true;
}
