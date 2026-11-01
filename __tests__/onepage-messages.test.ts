import {expect,it} from 'vitest';
import {catalogueProblems} from '@/lib/i18n/messages';
import {INTERFACE_LOCALES} from '@/lib/i18n/locale';
import {onePageMessages} from '@/ui/i18n/catalogues/onepage';

const keys = [
 'explore.eyebrow','explore.title','explore.summary','module.action',
 'modules.events.title','modules.events.summary',
 'modules.gallery.title','modules.gallery.summary',
 'modules.clients.title','modules.clients.summary',
 'modules.book.title','modules.book.summary',
 'modules.vendors.title','modules.vendors.summary',
 'modules.about.title','modules.about.summary',
 'shop.eyebrow','shop.title','shop.summary','shop.viewCart',
 'stories.eyebrow','stories.title','stories.all','stories.read',
];

it('provides the one-page interface contract in all six native languages',()=>{
 expect(catalogueProblems(onePageMessages)).toEqual([]);
 for(const locale of INTERFACE_LOCALES){
  expect(Object.keys(onePageMessages[locale]).sort()).toEqual([...keys].sort());
  for(const message of Object.values(onePageMessages[locale])){
   expect(typeof message).toBe('string');
   expect((message as string).trim()).not.toBe('');
  }
 }
 expect(onePageMessages.en['shop.summary']).toBe('Made to order. Pick your style and choose your options.');
});
