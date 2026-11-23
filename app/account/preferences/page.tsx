import NotificationPreferences from '@/ui/components/NotificationPreferences';
import NewsPreferences from '@/ui/components/NewsPreferences';
export const metadata={title:'Notification preferences | Urban Gang Tour',robots:{index:false,follow:false}};
export default function Page(){return <section className="modern-page wrap"><a href="/account">← Your account</a><h1>Notification preferences</h1><NotificationPreferences/><hr/><NewsPreferences/></section>}
