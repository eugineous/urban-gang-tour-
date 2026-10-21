'use client';
import {useEffect,useRef} from 'react';
import {enhanceHomeMotion} from '../lib/home-motion';
import styles from './HomeSections.module.css';
export function HomeMotion({children}:{children:React.ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(root.current)return enhanceHomeMotion(root.current)},[]);
 return <div ref={root} className={styles.home}>{children}</div>;
}
