import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Urban Gang Tour',
  description: 'How Urban Gang Tour collects, uses and protects your personal data under the Kenya Data Protection Act 2019.',
  alternates: { canonical: 'https://urbangangtour.co.ke/privacy-policy' },
};

export default function Page() {
  return <LegalPage title="Privacy Policy" updated="10 July 2026" sections={[
    { h: '1. Who we are', p: ['Urban Gang Tour ("we", "us") is a Kenyan entertainment and media company based in Nairobi. We are the data controller for personal data collected through urbangangtour.co.ke. Contact: admin@urbangangtour.co.ke.'] },
    { h: '2. What we collect', p: ['Booking enquiries: name, organisation, email, phone and your message.', 'Shop and ticket orders: name, email, phone number and order details. Payments are processed by Safaricom M-Pesa — we never see or store your M-Pesa PIN.', 'Accounts: email or phone, name, and a securely hashed password (we cannot read your password).', 'A privacy-friendly page-view counter that stores no personal information and only runs if you accept cookies.'] },
    { h: '3. Why we collect it (lawful basis)', p: ['To respond to booking requests and deliver orders (performance of a contract), to send receipts and service messages (legitimate interest), and to send the newsletter only where you subscribed (consent). We comply with the Kenya Data Protection Act, 2019.'] },
    { h: '4. Sharing', p: ['We do not sell personal data. We share it only with service providers needed to run the site (hosting on Vercel, payments via Safaricom M-Pesa, email delivery) and where the law requires.'] },
    { h: '5. Storage & security', p: ['Data is stored in an encrypted database. Access is restricted to authorised crew. Passwords are hashed; sessions are signed. We keep data only as long as needed for the purposes above or as law requires.'] },
    { h: '6. Your rights', p: ['Under the DPA 2019 you may ask us to access, correct, delete, or port your data, and you may object to or restrict processing. Email admin@urbangangtour.co.ke and we will respond within 30 days. You may also complain to the Office of the Data Protection Commissioner (ODPC) Kenya.'] },
    { h: '7. Cookies', p: ['We use one strictly-necessary cookie for signed-in sessions and a consent choice stored on your device. Our page-view counter only activates after you accept. No third-party advertising trackers are used.'] },
    { h: '8. Children', p: ['School events involve minors on stage and camera under agreements with their institutions and guardians. Online accounts are intended for users aged 13 and above.'] },
    { h: '9. Changes', p: ['We will post any changes here with a new "last updated" date.'] },
  ]} />;
}
