import {expect,it} from 'vitest';
import {catalogueProblems,type Catalogue} from '@/lib/i18n/messages';
import {INTERFACE_LOCALES} from '@/lib/i18n/locale';
import {shellMessages} from '@/ui/i18n/catalogues/shell';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {mediaMessages} from '@/ui/i18n/catalogues/media';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {formsMessages} from '@/ui/i18n/catalogues/forms';
import {accountMessages} from '@/ui/i18n/catalogues/account';
import {documentsMessages} from '@/ui/i18n/catalogues/documents';
import {helpMessages} from '@/ui/i18n/catalogues/help';
import {organizerAuthMessages} from '@/ui/i18n/catalogues/organizer-auth';
import {originalContentMessages} from '@/ui/i18n/OriginalContent';

// Dev-only integrity imports; the application shell never imports this registry.
const catalogues:Record<string,Catalogue<string>>={shellMessages,privacyMessages,marketingMessages,discoveryMessages,mediaMessages,commerceMessages,formsMessages,accountMessages,documentsMessages,helpMessages,organizerAuthMessages,originalContentMessages};
it.each(Object.entries(catalogues))('%s has complete non-empty native messages and matching placeholders',(name,catalogue)=>{
 expect(catalogueProblems(catalogue),name).toEqual([]);
 for(const locale of INTERFACE_LOCALES)for(const [key,message]of Object.entries(catalogue[locale])){
  const templates=typeof message==='string'?[message]:Object.values(message);
  for(const template of templates)expect(template?.trim(),`${name}.${locale}.${key}`).not.toBe('');
 }
});
