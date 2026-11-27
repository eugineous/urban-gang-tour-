'use client';

import {useEffect,useRef,type ReactNode} from 'react';

export default function NewsDisclosure({label,children,className,open}:{label:ReactNode;children:ReactNode;className?:string;open?:boolean}){
  const disclosure=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    const closeOutside=(e:PointerEvent)=>{
      const details=disclosure.current;
      if(details?.open&&e.target instanceof Node&&!details.contains(e.target))details.open=false;
    };
    document.addEventListener('pointerdown',closeOutside);
    return ()=>document.removeEventListener('pointerdown',closeOutside);
  },[]);
  return <details ref={disclosure} className={className} open={open||undefined} onKeyDown={e=>{
    if(e.key==='Escape'&&e.currentTarget.open){
      e.stopPropagation();
      e.currentTarget.open=false;
      e.currentTarget.querySelector('summary')?.focus();
    }
  }}><summary>{label}</summary>{children}</details>;
}
