import type { Metadata } from 'next';
import AccountApp from './AccountApp';
import {MessageText} from '@/ui/i18n/MessageText';
import {ticketAccessMessages} from '@/ui/i18n/catalogues/ticket-access';
import styles from '../my-tickets/TicketAccess.module.css';

export const metadata: Metadata = {
  title: 'My Account — Urban Gang Tour',
  description: 'Manage your Urban Gang Tour purchases, tickets, receipts, account access and privacy requests.',
  alternates: { canonical: 'https://urbangangtour.co.ke/account' },
  robots: { index: false, follow: true },
  referrer: 'no-referrer',
};

export default function AccountPage() {
  return (
    <section className={`${styles.page} ${styles.accountPage}`}>
      <header className={styles.intro}><h1><MessageText catalogue={ticketAccessMessages} message="accountHeading"/></h1><p><MessageText catalogue={ticketAccessMessages} message="accountIntro"/></p></header>
      <div className={styles.shortcut}><span><MessageText catalogue={ticketAccessMessages} message="guest"/></span><a href="/my-tickets"><MessageText catalogue={ticketAccessMessages} message="open"/></a></div>
      <AccountApp />
    </section>
  );
}
