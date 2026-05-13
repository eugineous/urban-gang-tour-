import './globals.css';
import { SiteNav, SiteFooter } from '@/components/site-chrome';

export const metadata = {
  title: 'Urban Gang Tour | From Potential to Purpose',
  description: 'Production-quality live events in Kenyan high schools, universities and campuses. Talent battles, mentorship, awards and national TV. Hosted by Eugine Micah and Lucy Ogunde.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        <main style={{ paddingTop: '72px' }}>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
