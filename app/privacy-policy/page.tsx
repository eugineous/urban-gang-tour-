import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Urban Gang Tour',
  description: 'How Urban Gang Tour collects, uses and protects your personal data under the Kenya Data Protection Act 2019.',
  alternates: { canonical: 'https://urbangangtour.co.ke/privacy-policy' },
};

export default function Page() {
  return <LegalPage title="Privacy Policy" updated="9 October 2026" sections={[
    { h: '1. Who we are', p: ['Urban Gang Tour ("we", "us") is a Kenyan entertainment and media company based in Nairobi. We are the data controller for personal data collected through urbangangtour.co.ke. Contact: admin@urbangangtour.co.ke.'] },
    { h: '2. What we collect', p: ['Booking enquiries: name, organisation, email, phone and your message.', 'Shop and ticket orders: name, email, phone number and order details. Payment credentials are handled by the payment provider used at checkout. We do not store M-Pesa PINs or card details.', 'Accounts: email or phone, name, and a securely hashed password (we cannot read your password).', 'A privacy-friendly page-view counter that stores no personal information and only runs if you accept cookies.'] },
    { h: '3. Why we collect it (lawful basis)', p: ['To respond to booking requests and deliver orders (performance of a contract), to send receipts and service messages (legitimate interest), and to send the newsletter only where you subscribed (consent). We comply with the Kenya Data Protection Act, 2019.'] },
    { h: '4. Sharing', p: ['We do not sell personal data. We share it only with service providers needed to run the site, payment and email services used to fulfil your request, and where the law requires.'] },
    { h: '5. Storage & security', p: ['Data is stored in an encrypted database. Access is restricted to authorised crew. Passwords are hashed; sessions are signed. We keep data only as long as needed for the purposes above or as law requires.'] },
    { h: 'Ticket verification and safety', p: ['Ticket QR codes open a public status page, not the administration console. The public page does not show your name, email or phone. Only authorised staff with gate-scanner permission can retrieve ticket-holder contacts for event operations or safety, and access is logged. Ticket links are private bearer credentials: do not publish them. Decorative security marks do not replace the server signature and single-use gate check.'] },
    { h: 'Returning visits', p: ['Signed-in sessions use necessary secure cookies. We do not use hidden device fingerprinting or collect your precise location to recognise you. Your cart and display preferences may be stored on your own device; payment credentials and customer contact directories are never stored there.'] },
    { h: '6. Your rights', p: ['Under the DPA 2019 you may ask us to access, correct, delete, or port your data, and you may object to or restrict processing. Email admin@urbangangtour.co.ke and we will respond within 30 days. You may also complain to the Office of the Data Protection Commissioner (ODPC) Kenya.'] },
    { h: '7. Cookies', p: ['We use necessary cookies for signed-in sessions and abuse prevention, plus a consent choice stored on your device. Our page-view counter only activates after you accept. No third-party advertising trackers are used.'] },
    { h: '8. Children', p: ['School events involve minors on stage and camera under agreements with their institutions and guardians. New self-managed accounts are for adults aged 18 and over, confirmed at signup. We do not collect a date of birth or identity document for this confirmation. A parent or guardian should manage bookings and purchases for anyone under 18.'] },
    { h: '9. Changes', p: ['We will post any changes here with a new "last updated" date.'] },
  ]} />;
}
