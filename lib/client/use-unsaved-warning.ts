'use client';
import {useEffect} from 'react';
/** Browser confirmation only; private content is not written to localStorage. */
export function useUnsavedWarning(enabled:boolean){useEffect(()=>{if(!enabled)return;const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect)},[enabled]);}
