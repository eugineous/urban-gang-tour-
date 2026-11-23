import Link from '@/ui/components/ReaderLink';
import NewsPreferences from '@/ui/components/NewsPreferences';
export const metadata={title:'Reading preferences — Urban News',robots:{index:false,follow:false}};
export default function Page(){return <section className="modern-page wrap"><Link href="/for-you">← Urban News</Link><NewsPreferences/></section>}
