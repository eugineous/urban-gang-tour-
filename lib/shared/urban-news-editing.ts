import exclusions from '@/data/urban-news-exclusions.json';

const escapedTerms=exclusions.terms.map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
const blocked=new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+escapedTerms+')(?=$|[^\\p{L}\\p{N}])','iu');
const placeholder=/(?:^|[/.-])(?:placeholder|chart-edition|brand-tile|poster|default|fallback|og-default|pwa-512|news-card-default)(?:[/_.-]|$)/i;

export function blockedNewsMaterial(...text:(string|undefined)[]){
  return text.some(value=>typeof value==='string'&&blocked.test(value.normalize('NFKC').replace(/\s+/gu,' ')));
}

export function realNewsImage(value?:string){
  if(!value||!value.startsWith('/')||value.startsWith('//')||placeholder.test(value))return '';
  if(/^\/news\/brief\/20\d\d-\d\d-\d\d\/[a-f0-9]{24}\/photo\/(?:480|960)$/.test(value))return value;
  if(value.startsWith('/news/photos/')||value.startsWith('/media/admin-stories/'))return /\.(?:png|jpe?g|webp|avif)$/i.test(value)?value:'';
  return '';
}
