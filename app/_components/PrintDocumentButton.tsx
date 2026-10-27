"use client";
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {formatNairobiTime} from '@/lib/i18n/format';
import {documentsMessages,factoryIssue,statusIssue} from '@/ui/i18n/catalogues/documents';
import {MessageText} from '@/ui/i18n/MessageText';
import type {ReactNode} from 'react';
import {EventAmount,PublicationDate} from '@/ui/components/PublicationDate';
export function PrintDocumentButton(){
 const t=useMessages(documentsMessages);return <button className="button secondary" onClick={()=>window.print()}>{t("copy.print_receipt")}</button>}

/** Only fixed factory labels are mapped; original document values stay source data. */
export function DocumentLabel({label}:{label:ReactNode}){
 if(typeof label!=='string')return <>{label}</>;
 const issue=factoryIssue(label);
 return documentsMessages.en[issue.key]===label?<MessageText catalogue={documentsMessages} message={issue.key}/>:<span lang="en-KE">{label}</span>;
}
export function DocumentStatus({status,domain='order'}:{status:unknown;domain?:'order'|'booking'}){
 return <MessageText catalogue={documentsMessages} message={statusIssue(status,domain).key}/>;
}
export function DocumentAmount({value}:{value:number}){return <EventAmount value={value}/>}
export function DocumentDate({value}:{value:string}){
 const {locale}=useInterfaceLanguage(),time=formatNairobiTime(value,locale);
 return <><PublicationDate value={value}/>{time&&<> · <time dateTime={value}>{time}</time></>}</>;
}
