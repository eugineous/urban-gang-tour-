import {cached} from '@/lib/server/microcache';
import {fetchKenyaMusicLead,KENYA_CHART_URL} from '@/lib/server/urban-news-providers';
import {fetchKenyaChartBackup} from '@/lib/server/urban-news-market-sources';
import styles from './UrbanNews.module.css';

/** The display attributes the ranking and date to the publisher of the chart. */
export default async function UrbanMusicChart(){
 const lead=await cached('urban-news:kenya-music-chart',15*60_000,async()=>{
  try{return await fetchKenyaMusicLead()}catch{return await fetchKenyaChartBackup().catch(()=>null)}
 },false);
 if(!lead||Math.abs(Date.now()-Date.parse(lead.observedAt))>48*3600000)return null;
 const date=new Intl.DateTimeFormat('en-KE',{dateStyle:'long',timeZone:'Africa/Nairobi'}).format(new Date(lead.observedAt));
 return <section className={styles.chart} aria-label="Apple Music Kenya chart" lang="en-KE">
  <p className={styles.meta}>Music · Kenya · <time dateTime={lead.observedAt}>{date}</time></p>
  <h2>{lead.title}</h2>
  <a href={lead.url} rel="noopener noreferrer">Listen on Apple Music ↗</a>
  <a href={KENYA_CHART_URL} rel="noopener noreferrer">View chart source ↗</a>
 </section>;
}
