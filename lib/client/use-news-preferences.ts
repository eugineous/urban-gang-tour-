'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {createNewsPreferenceStore} from './news-preferences';
import type {NewsPreferences} from '@/lib/shared/news-preferences';

export function useNewsPreferences(){
 const [store]=useState(()=>createNewsPreferenceStore({storage:()=>typeof window==='undefined'?null:window.localStorage,events:typeof window==='undefined'?new EventTarget():window}));
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
 useEffect(()=>{store.start();return store.stop},[store]);
 return {...snapshot,save:(value:NewsPreferences)=>{store.set(value);return store.getSnapshot()},reset:()=>{store.reset();return store.getSnapshot()}};
}
