'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Newspaper} from '@phosphor-icons/react';
import styles from './NewsPreviewStrip.module.css';

export default function NewsPreviewStrip(){
  const [story,setStory]=useState<{path:string;headline:string}|null>(null);
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/api/site-data/news-preview',{signal:abort.signal}).then(response=>response.ok?response.json():null).then(value=>{
      if(value&&typeof value.headline==='string'&&value.headline.length<=230&&/^\/news\/brief\/20\d\d-\d\d-\d\d\/[a-f0-9]{24}$/.test(value.path))setStory(value);
    }).catch(()=>{});
    return ()=>abort.abort();
  },[]);
  return <nav className={styles.strip} aria-label="Urban News preview">
    <a className={styles.label} href="/blog"><Newspaper size={17} aria-hidden="true"/> Urban News</a>
    {story&&<a className={styles.story} href={story.path}>{story.headline}</a>}
    <a className={styles.arrow} href="/blog" aria-label="All Urban News stories"><ArrowUpRight size={18} aria-hidden="true"/></a>
  </nav>;
}
