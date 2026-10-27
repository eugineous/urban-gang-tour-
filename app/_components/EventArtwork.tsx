'use client';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import styles from './PartnerEvents.module.css';
export function EventArtwork({name,image,label,labelMessage='details.announcement'}:{name:string;image?:string;label?:string;labelMessage?:'details.announcement'|'details.fromArchive'}){
 const t=useMessages(discoveryMessages),displayLabel=label??t(labelMessage);
 return image?<img src={image} alt={t('card.image',{name})}/>:<div className={styles.placeholder} role="img" aria-label={t('artwork.placeholder',{label:displayLabel,name})}><span lang={label?'en-KE':undefined}>{displayLabel}</span><strong lang="en-KE">{name}</strong><small>{t('artwork.brand')}</small></div>;
}

export function OriginalEventPoster({name,image,caption}:{name:string;image:string;caption?:string}){
 const t=useMessages(discoveryMessages),{locale}=useInterfaceLanguage();
 return <a href={image} target="_blank" rel="noopener noreferrer" aria-label={t('artwork.original',{name})}><img lang={caption?'en-KE':locale==='en'?'en-KE':locale} src={image} alt={caption||t('artwork.originalAlt',{name})}/></a>;
}
