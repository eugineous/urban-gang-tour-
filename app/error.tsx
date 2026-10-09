"use client";
import {useEffect} from 'react';
export default function Error({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error('[page-error]',error)},[error]);return <section className="current-state wrap" role="alert"><p className="eyebrow">Page unavailable</p><h1>Try that again.</h1><p>The page could not load. Your payment status must be confirmed by the server before you retry a purchase.</p><div className="current-actions"><button className="button" onClick={reset}>Reload this page</button><a href="/">Go home</a></div></section>}
