// Scoped SSR/CSS contracts; production-browser geometry is verified separately.
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';
import {ContactPage} from '@/ui/components/ContactInterface';
import chrome from '@/ui/components/ContactChrome.module.css';
import {shellMessages} from '@/ui/i18n/catalogues/shell';

const css=postcss.parse(readFileSync('ui/components/ContactChrome.module.css','utf8'));
function declarations(selector:string){
 const values:Record<string,string>={};
 css.walkRules(selector,rule=>{rule.walkDecls(declaration=>{values[declaration.prop]=declaration.value})});
 return values;
}

describe('scoped contact page layout',()=>{
 it('groups direct contact actions on separate grid rows without changing their destinations',()=>{
  const html=renderToStaticMarkup(createElement(ContactPage));
  const group=html.match(new RegExp(`<div class="${chrome.personLinks}">([\\s\\S]*?)</div>`))?.[1];
  expect(group).toBeDefined();
  expect(group).toContain('href="tel:+254799886247"');
  expect(group).toContain('href="mailto:admin@urbangangtour.co.ke"');
  expect(group).toContain('href="https://wa.me/254799886247"');
  expect(group?.match(/<a /g)).toHaveLength(3);
  expect(declarations('.personLinks')).toMatchObject({display:'grid','grid-template-columns':'minmax(0,1fr)','justify-items':'start',gap:'8px'});
  expect(declarations('.personLinks>a')).toMatchObject({'min-height':'44px','max-width':'100%','font-size':'16px','overflow-wrap':'anywhere'});
  expect(declarations('.personLinks>a:global(.button)')).toMatchObject({'font-size':'16px'});
 });
 it('gives only the saved-message reset control a fit-content 44px target',()=>{
  const source=readFileSync('ui/components/ContactInterface.tsx','utf8');
  expect(source).toContain('className={`button secondary ${chrome.newMessage}`} type="button" onClick={startNew}');
  expect(source).toContain("{t('contact.newMessage')}");
  expect(shellMessages.en['contact.newMessage']).toBe('New message');
  expect(source).toContain("function startNew(){setDraft(emptyContact);setReference('');setError('');attempt.current=null;}");
  expect(declarations('.newMessage:global(.button.secondary)')).toMatchObject({width:'fit-content','inline-size':'fit-content','min-height':'44px','min-block-size':'44px','justify-self':'start'});
  expect(source).toContain("{t('contact.saved')}");
  expect(shellMessages.en['contact.saved']).toBe('Your enquiry is saved for the team.');
 });
});
