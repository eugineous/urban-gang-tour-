'use client';

import {type ReactNode} from 'react';
import {defineCatalogue} from '../../lib/i18n/messages';
import {useInterfaceLanguage} from './LanguageProvider';
import {MessageText} from './MessageText';

export const originalContentMessages = defineCatalogue({
  en:{disclosure:'This content is shown in its original language.'},
  sw:{disclosure:'Maudhui haya yanaonyeshwa katika lugha yake ya asili.'},
  fr:{disclosure:'Ce contenu est présenté dans sa langue d’origine.'},
  'zh-Hans':{disclosure:'此内容以原文语言显示。'},
  ru:{disclosure:'Этот материал показан на языке оригинала.'},
  es:{disclosure:'Este contenido se muestra en su idioma original.'},
});

export function OriginalContent({children,language = 'en-KE',disclose = false,inline = false}:{
  children:ReactNode;
  language?:string;
  disclose?:boolean;
  inline?:boolean;
}) {
  const {locale} = useInterfaceLanguage();
  const Source = inline ? 'span' : 'div';
  const source = <Source lang={language}>{children}</Source>;
  if (!disclose) return source;
  const Notice = inline ? 'span' : 'p';
  return <><Notice lang={locale}><MessageText catalogue={originalContentMessages} message="disclosure"/></Notice>{source}</>;
}
