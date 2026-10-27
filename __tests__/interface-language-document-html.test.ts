import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';
import {formatMessage,type Catalogue,type MessageValues} from '@/lib/i18n/messages';
const fixture=vi.hoisted(()=>({locale:'en' as InterfaceLocale,status:'new'}));
afterEach(()=>{fixture.locale='en'});
vi.mock('@/ui/i18n/LanguageProvider',async original=>({...await original<typeof import('@/ui/i18n/LanguageProvider')>(),useInterfaceLanguage:()=>({locale:fixture.locale}),useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,fixture.locale,key,values).text}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not-found')}}));
vi.mock('@/lib/server/db',()=>({q:vi.fn(async(sql:string)=>sql.includes('FROM bookings')?[{id:'B-FICTIONAL',type:'Original event type',status:fixture.status}]:[{id:'ORD-ORIGINAL',status:'pending'}]),hasDb:()=>true,db:()=>true}));
vi.mock('@/lib/server/session',()=>({verifyToken:vi.fn(()=>({scope:'booking_status',bookingId:'B-FICTIONAL'}))}));
import OrderVerification from '@/app/verify/order/[id]/page';
import {PrintDocumentButton} from '@/app/_components/PrintDocumentButton';
import BookingStatus from '@/app/book/status/page';
it('keeps anonymous verification identifiers and minimal projection server guarded',async()=>{
 await expect(OrderVerification({params:Promise.resolve({id:'invalid'})})).rejects.toThrow('not-found');
 const html=renderToStaticMarkup(await OrderVerification({params:Promise.resolve({id:'ORD-ORIGINAL'})}));
 expect(html).toContain('ORD-ORIGINAL');expect(html).toContain('data-language-control');expect(html).not.toContain('email@');
});
it('keeps English initial printable controls without depending on a translation service',()=>{
 const html=renderToStaticMarkup(createElement(PrintDocumentButton));expect(html).toContain('Print receipt');expect(html).not.toContain('translate.google');
});
it.each(INTERFACE_LOCALES)('renders confirmed and closed booking states without implying processing in %s',async locale=>{
 fixture.locale=locale;
 const labels={en:['Under review','Replied','Confirmed','Closed','Unknown'],sw:['Inakaguliwa','Imejibiwa','Imethibitishwa','Imefungwa','Haijulikani'],fr:['En cours d’examen','Répondu','Confirmée','Fermée','Inconnu'],'zh-Hans':['审核中','已回复','已确认','已关闭','未知'],ru:['На рассмотрении','Ответ отправлен','Подтверждено','Закрыт','Неизвестно'],es:['En revisión','Respondida','Confirmada','Cerrada','Desconocido']};
 for(const [index,status]of ['review','replied','confirmed','closed','unrecognized'].entries()){
  fixture.status=status;const html=renderToStaticMarkup(await BookingStatus({searchParams:Promise.resolve({token:'fictional-booking-token'})}));
  expect(html).toContain('>'+labels[locale][index]+'</span>');expect(html).toContain('B-FICTIONAL');expect(html).toContain('Original event type');
 }
});
