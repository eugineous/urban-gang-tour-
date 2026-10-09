"use client";
import {ShareActions} from "../../public-design/components/ShareActions";
export function ShareBar({url,title}:{url:string;title:string}){const u=new URL(url);return <ShareActions title={title} path={u.pathname+u.search} label="Share this story"/>}
