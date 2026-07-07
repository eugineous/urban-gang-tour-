import ContactForm from './ContactForm';

export const metadata = {
  title: 'Contact | Urban Gang Tour',
  description: 'Book a stop, propose a partnership, or reach out to Eugine and Lucy directly. We respond within 24 hours.',
  keywords: 'Urban Gang Tour contact, book school event Kenya, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya, UGT booking',
  alternates: { canonical: 'https://urbangangtour.co.ke/contact' },
};

export default function ContactPage() {
  return <ContactForm />;
}
