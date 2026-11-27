import {ImageResponse} from 'next/og';
import {briefCountry,getPublisherBrief} from '@/lib/server/urban-news-briefs';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';

const palette={Music:['#63043b','#f7128d'],Screen:['#30215b','#9476f1'],Culture:['#3f162d','#fb9d28'],Sport:['#192c49','#56d9db']};

export async function GET(_request:Request,{params}:{params:Promise<{day:string;id:string}>}){
 const {day,id}=await params;
 const brief=urbanNewsEnabled()?await getPublisherBrief(day,id):null;
 if(!brief)return new Response('Image unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
 const [dark,accent]=palette[brief.topic];
 const country=briefCountry(brief);
 return new ImageResponse(
   <div style={{display:'flex',width:'100%',height:'100%',background:dark,color:'#fff',padding:75,flexDirection:'column',justifyContent:'space-between'}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:31,letterSpacing:3}}>
       <span style={{fontWeight:700}}>URBAN NEWS</span><span style={{color:'#fff'}}>{country.toUpperCase()}</span>
     </div>
     <div style={{display:'flex',flexDirection:'column',borderLeft:`14px solid ${accent}`,paddingLeft:38}}>
       <span style={{fontSize:30,marginBottom:18}}>{brief.topic}</span>
       <span style={{fontSize:brief.headline.length>110?48:59,fontWeight:700,lineHeight:1.08}}>{brief.headline}</span>
     </div>
     <span style={{fontSize:25}}>{brief.publisher} · {day}</span>
   </div>,{width:1200,height:630,headers:{'Cache-Control':'public, max-age=3600'}}
 );
}
