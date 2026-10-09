import {Suspense} from 'react';
import {GlobalFloatingTalk} from '../../public-design/components/ContactInterface';
import HostedSite from '../../public-design/components/HostedSite';
import {LiveCommerce} from './LiveCommerce';
import {BookingForm} from './BookingForm';
export function RenderedPage({pathName}:{pathName:string}){
 if(pathName==='/shop')return <LiveCommerce/>;
 if(pathName==='/book')return <BookingForm/>;
 return <><GlobalFloatingTalk/><Suspense><HostedSite path={pathName} screens={[]} products={[]} events={[]} posts={[]}/></Suspense></>;
}
