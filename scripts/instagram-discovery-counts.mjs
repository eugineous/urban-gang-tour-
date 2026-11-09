/** Known links absent from collected metadata; their two discovery paths are not two posts. */
export function knownVisibleInstagramLinks(links,knownCodes,posts){
 const collected=new Set(posts.map(post=>post.code));
 return new Set(links.map(link=>new URL(link).pathname.split('/').filter(Boolean).at(-1)).filter(code=>knownCodes.has(code)&&!collected.has(code))).size;
}
