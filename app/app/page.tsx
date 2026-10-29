import type {Metadata} from 'next';
import AppClient from './AppClient';

export const metadata:Metadata = {
  title:'Get the app | Urban Gang Tour',
  description:'Install Urban Gang Tour for quick access to the shop, your order progress and your tickets. Get help with installation, connectivity and updates.',
  alternates:{canonical:'/app'},
  openGraph:{title:'Get the app | Urban Gang Tour', description:'Keep the shop, your order progress and your tickets within reach.', url:'/app'},
};

export default function AppPage() {return <AppClient/>;}
