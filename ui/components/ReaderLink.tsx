import Link from 'next/link';
import type {AnchorHTMLAttributes} from 'react';
/** Keep temporary reading choices across the app's explicit reader navigation. */
export default function ReaderLink(props:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){return <Link {...props} prefetch={false}/>}
