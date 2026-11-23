'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {createNewsPreferenceStore} from './news-preferences';
import type {NewsPreferences} from '@/lib/shared/news-preferences';

type ReaderStore=ReturnType<typeof createNewsPreferenceStore>;
let browserStore:ReaderStore|undefined;
const mounts=new WeakMap<ReaderStore,number>();
function makeStore(){return createNewsPreferenceStore({storage:()=>typeof window==='undefined'?null:window.localStorage,events:typeof window==='undefined'?new EventTarget():window})}
function storeForRender(){if(typeof window==='undefined')return makeStore();return browserStore??=makeStore()}
export function useNewsPreferences(){
 const [store]=useState(storeForRender);
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
 useEffect(()=>{const count=mounts.get(store)||0;mounts.set(store,count+1);if(!count)store.start();return()=>{const remaining=(mounts.get(store)||1)-1;mounts.set(store,remaining);if(!remaining)store.stop()}},[store]);
 return {...snapshot,save:(value:NewsPreferences)=>{store.set(value);return store.getSnapshot()},reset:()=>{store.reset();return store.getSnapshot()}};
}
