import {MessageText} from '@/ui/i18n/MessageText';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Page not found | Urban Gang Tour',robots:{index:false,follow:true}};
export default function NotFound(){return <section className="current-state wrap"><p className="eyebrow"><MessageText catalogue={shellMessages} message="notFound.label"/></p><h1><MessageText catalogue={shellMessages} message="notFound.title"/></h1><p><MessageText catalogue={shellMessages} message="notFound.description"/></p><div className="current-actions"><a className="button" href="/"><MessageText catalogue={shellMessages} message="action.home"/></a><a href="/events"><MessageText catalogue={shellMessages} message="action.events"/></a><a href="/contact-us"><MessageText catalogue={shellMessages} message="action.contact"/></a></div></section>}
