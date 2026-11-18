import {DEFAULT_NEWS_PREFERENCES,parseNewsPreferences,type NewsPreferences} from '@/lib/shared/news-preferences';
export const NEWS_PREFERENCE_KEY='ugt-news-preferences-v1';
const CHOICE_EVENT='ugt-news-preference-choice';
export type NewsPreferenceSnapshot=Readonly<{preferences:NewsPreferences;persistence:'unchecked'|'available'|'unavailable'}>;
const SERVER_SNAPSHOT:NewsPreferenceSnapshot=Object.freeze({preferences:DEFAULT_NEWS_PREFERENCES,persistence:'unchecked'});
type StorageLike=Pick<Storage,'getItem'|'setItem'>;

export function createNewsPreferenceStore(options:{storage:()=>StorageLike|null;events:EventTarget}){
 let snapshot=SERVER_SNAPSHOT,started=false,pending=false;
 const listeners=new Set<()=>void>();
 function update(preferences:NewsPreferences,persistence:NewsPreferenceSnapshot['persistence']){
  if(snapshot.persistence===persistence&&JSON.stringify(snapshot.preferences)===JSON.stringify(preferences))return;
  snapshot=Object.freeze({preferences,persistence});for(const listener of listeners)listener();
 }
 function load(){
  if(pending)return;
  try{const storage=options.storage();if(!storage)throw Error();const raw=storage.getItem(NEWS_PREFERENCE_KEY);let parsed:NewsPreferences|null=null;if(raw&&raw.length<=2048){try{parsed=parseNewsPreferences(JSON.parse(raw))}catch{}}
   update(parsed||DEFAULT_NEWS_PREFERENCES,'available');
  }catch{update(snapshot.preferences,'unavailable')}
 }
 function choice(event:Event){const data=(event as CustomEvent<NewsPreferenceSnapshot>).detail;const parsed=parseNewsPreferences(data?.preferences);if(parsed&&['available','unavailable'].includes(data?.persistence)){pending=data.persistence==='unavailable';update(parsed,data.persistence)}}
 function storage(event:Event){const key=(event as StorageEvent).key;if(key===NEWS_PREFERENCE_KEY||key===null)load()}
 function set(value:NewsPreferences){
  const parsed=parseNewsPreferences(value);if(!parsed)throw Error('invalid_news_preferences');
  pending=true;let persistence:NewsPreferenceSnapshot['persistence']='unavailable';
  try{const storage=options.storage();if(!storage)throw Error();const raw=JSON.stringify(parsed);storage.setItem(NEWS_PREFERENCE_KEY,raw);if(storage.getItem(NEWS_PREFERENCE_KEY)!==raw)throw Error();pending=false;persistence='available'}catch{}
  update(parsed,persistence);const event=new Event(CHOICE_EVENT);Object.defineProperty(event,'detail',{value:snapshot});options.events.dispatchEvent(event);
 }
 return {
  getSnapshot:()=>snapshot,getServerSnapshot:()=>SERVER_SNAPSHOT,
  subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
  start:()=>{if(started)return;started=true;options.events.addEventListener('storage',storage);options.events.addEventListener(CHOICE_EVENT,choice);load()},
  stop:()=>{started=false;options.events.removeEventListener('storage',storage);options.events.removeEventListener(CHOICE_EVENT,choice)},
  set,reset:()=>set(DEFAULT_NEWS_PREFERENCES),
 };
}
