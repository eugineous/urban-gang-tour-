import {Fragment} from 'react';
/** Tiny escaped Markdown subset: citations/emphasis, never raw HTML. */
export function ArticleInline({text}:{text:string}){
  const parts=text.split(/(\[[^\]\n]{1,300}\]\(https:\/\/[^\s)]+\)|\*\*[^*\n]+\*\*)/g);
  return <>{parts.map((part,index)=>{
    if(part.startsWith('**')&&part.endsWith('**'))return <strong key={index}>{part.slice(2,-2)}</strong>;
    const link=/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(part);
    if(link){try{const url=new URL(link[2]);if(!url.username&&!url.password)return <a key={index} href={url.href} rel="noopener noreferrer">{link[1]}</a>}catch{}}
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
export default function ArticleText({paragraph}:{paragraph:string}){
  if(paragraph.startsWith('### '))return <h3 lang="en-KE"><ArticleInline text={paragraph.slice(4)}/></h3>;
  if(paragraph.startsWith('## '))return <h2 lang="en-KE"><ArticleInline text={paragraph.slice(3)}/></h2>;
  if(paragraph.startsWith('> '))return <blockquote lang="en-KE"><ArticleInline text={paragraph.slice(2)}/></blockquote>;
  if(paragraph.split('\n').every(line=>/^[-*] /.test(line)))return <ul lang="en-KE">{paragraph.split('\n').map((line,i)=><li key={i}><ArticleInline text={line.slice(2)}/></li>)}</ul>;
  return <p lang="en-KE"><ArticleInline text={paragraph}/></p>;
}
