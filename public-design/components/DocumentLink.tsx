import type {AnchorHTMLAttributes} from 'react';
export function internalHref(href:string|undefined){if(!href)return href;try{const u=new URL(href);if(['urbangangtour.co.ke','www.urbangangtour.co.ke'].includes(u.hostname)&&['http:','https:'].includes(u.protocol))return u.pathname+u.search+u.hash}catch{}return href}
export default function DocumentLink(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props} href={internalHref(props.href)}/>}
