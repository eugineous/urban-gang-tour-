import {SITE} from './site';
export function publicImageUrl(image:string) {
  if (!image.trim()) return SITE.defaultOg;
  try {
    const url=new URL(image,SITE.domain);
    if (/^https?:$/.test(url.protocol)&&!url.username&&!url.password) return url.href;
  } catch {}
  return SITE.defaultOg;
}
