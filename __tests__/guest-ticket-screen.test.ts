import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import GuestTicketAccess from '@/app/my-tickets/GuestTicketAccess';
import {navigationMessageKey,shellMessages} from '@/ui/i18n/catalogues/shell';
import {formatMessage} from '@/lib/i18n/messages';
it('keeps the new shared ticket destination localized rather than falling back to the English label',()=>{
 const key=navigationMessageKey('/my-tickets');expect(key).toBe('nav.tickets');
 expect(formatMessage(shellMessages,'sw',key!).fallback).toBe(false);
 expect(formatMessage(shellMessages,'sw',key!).text).toBe('Tiketi zangu');
});
it('offers guest ticket access before optional sign-in without requesting credentials or claiming a ticket exists',()=>{
 const html=renderToStaticMarkup(createElement(GuestTicketAccess));
 expect(html).toContain('No account needed');expect(html).toContain('Ticket link or order reference');
 expect(html).toContain('Open tickets');expect(html).toContain('href="/account?mode=signup"');expect(html).toContain('href="/account"');
 expect(html).toMatch(/<input[^>]*disabled/);expect(html).toMatch(/<button[^>]*disabled/);
 expect(html.indexOf('Open tickets')).toBeLessThan(html.indexOf('href="/account"'));
 expect(html).not.toContain('type="password"');expect(html).not.toContain('Payment confirmed');expect(html).not.toContain('name="reference"');
});
