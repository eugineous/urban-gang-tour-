'use client';
import {useEffect} from 'react';
import {onCLS,onFCP,onINP,onLCP,onTTFB,type Metric} from 'web-vitals';
export function PerformanceVitals(){useEffect(()=>{const report=(metric:Metric)=>{try{if(localStorage.getItem('ugt-consent')!=='yes'||/^\/(api|admin|account|organizer|cart|checkout|pay|receipt|tickets|t|verify|orders|book\/status)(\/|$)/.test(location.pathname))return;const body=JSON.stringify({name:metric.name,value:metric.value,path:location.pathname});navigator.sendBeacon('/api/performance',new Blob([body],{type:'application/json'}))}catch{}};onCLS(report);onFCP(report);onINP(report);onLCP(report);onTTFB(report)},[]);return null}
