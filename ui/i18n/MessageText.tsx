'use client';

import {Fragment, type ReactNode} from 'react';
import {formatInterfaceNumber} from '../../lib/i18n/format';
import {selectMessageTemplate, type Catalogue} from '../../lib/i18n/messages';
import {useInterfaceLanguage} from './LanguageProvider';

export function MessageText<K extends string>({catalogue,message,values = {}}:{
  catalogue:Catalogue<K>;
  message:K;
  values?:Readonly<Record<string,ReactNode>>;
}) {
  const {locale} = useInterfaceLanguage();
  const own = (key:string) => Object.prototype.hasOwnProperty.call(values,key);
  const count = own('count') && typeof values.count === 'number' ? values.count : undefined;
  const selected = selectMessageTemplate(catalogue,locale,message,count);
  const content:ReactNode[] = [];
  let offset = 0;
  for (const match of selected.template.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
    content.push(selected.template.slice(offset,match.index));
    const value = own(match[1]) ? values[match[1]] : null;
    content.push(<Fragment key={match.index}>{typeof value === 'number' ? formatInterfaceNumber(value,locale) : value}</Fragment>);
    offset = match.index + match[0].length;
  }
  content.push(selected.template.slice(offset));
  return <span lang={selected.lang}>{content}</span>;
}
