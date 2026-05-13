// Pages: Apply, EventPage (legacy), AboutPage, SchoolsIndex, SchoolPage, TeamPage, NewsPage, ContactPage, SponsorPage

function ApplyPage({ onBack }) {
  const [submitted, setSubmitted] = React.useState(false);
  return (
    <div style={{background:'#FDF0F7', minHeight:'100vh', padding:'60px 36px'}}>
      <div style={{maxWidth:'760px', margin:'0 auto'}}>
        <button onClick={onBack} style={apStyle.back}>← Back home</button>
        <div style={apStyle.eye}>Bring UGT to your school</div>
        <h1 style={apStyle.h1}>Your school, <span style={{color:'#C7238E'}}>next.</span></h1>
        <p style={apStyle.p}>Tell us about your institution. We'll come back within 3 working days.</p>
        {submitted ? (
          <div style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'20px', padding:'40px', boxShadow:'6px 6px 0 #C7238E', textAlign:'center'}}>
            <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'48px', color:'#C7238E', transform:'rotate(-3deg)'}}>Gotcha!</div>
            <div style={{fontFamily:'Anton', fontSize:'36px', textTransform:'uppercase', marginTop:'16px'}}>We'll be in touch.</div>
            <p style={{fontFamily:'Inter', fontSize:'16px', color:'#3A3A3A', marginTop:'12px'}}>The crew reads every one. Urban Gang Tour will be back!</p>
          </div>
        ) : (
          <form onSubmit={(e)=>{e.preventDefault();setSubmitted(true);}} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'20px', padding:'32px', boxShadow:'6px 6px 0 #1A1A1A', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px'}}>
            <Field l="School Name" full v=""/>
            <Field l="Your Role"><select style={inputStyle}><option>Principal</option><option>Deputy Principal</option><option>Teacher</option><option>Student Leader</option></select></Field>
            <Field l="County" v=""/>
            <Field l="Preferred Date" v=""/>
            <Field l="Estimated Students" v=""/>
            <Field l="Why UGT at your school?" full><textarea rows="3" style={inputStyle}/></Field>
            <div style={{gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontFamily:'Inter', fontSize:'12px', color:'#6B6B6B'}}>No character limit. We read every one.</div>
              <button type="submit" style={{fontFamily:'Inter', fontWeight:900, fontSize:'14px', letterSpacing:'.1em', textTransform:'uppercase', padding:'14px 26px', border:'3px solid #1A1A1A', borderRadius:'999px', background:'#C7238E', color:'#fff', boxShadow:'6px 6px 0 #1A1A1A', cursor:'pointer'}}>Submit booking →</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
const apStyle = {
  back:{fontFamily:'Inter', fontWeight:900, fontSize:'12px', letterSpacing:'.14em', textTransform:'uppercase', color:'#C7238E', background:'transparent', border:'none', cursor:'pointer', marginBottom:'20px'},
  eye:{fontFamily:'Inter', fontWeight:800, fontSize:'12px', letterSpacing:'.18em', textTransform:'uppercase', color:'#C7238E'},
  h1:{fontFamily:'Anton', fontSize:'90px', color:'#1A1A1A', margin:'10px 0 10px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.95},
  p:{fontFamily:'Inter', fontSize:'17px', color:'#3A3A3A', marginBottom:'30px', lineHeight:1.55},
};
const inputStyle = { width:'100%', fontFamily:'Inter', fontSize:'15px', padding:'10px 12px', border:'2.5px solid #1A1A1A', borderRadius:'10px', background:'#fff', boxShadow:'3px 3px 0 #1A1A1A', boxSizing:'border-box' };
function Field({l, v, children, full}) {
  return (<div style={{gridColumn: full?'1 / -1':'auto'}}>
    <label style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.12em', textTransform:'uppercase', color:'#1A1A1A', display:'block', marginBottom:'6px'}}>{l}</label>
    {children || <input type="text" defaultValue={v} style={inputStyle}/>}
  </div>);
}

// ---------- AboutPage ----------
function AboutPage({ onNav }) {
  const stats = window.UGT_DATA?.stats || {};
  return (
    <div>
      <section style={{background:'#0A0A0A', color:'#fff', padding:'80px 36px 60px', position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse 700px 400px at 30% 0%, rgba(199,35,142,.5), transparent 60%)'}}/>
        <div style={{maxWidth:'1100px', margin:'0 auto', position:'relative'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>About Urban Gang Tour</div>
          <h1 style={{fontFamily:'Anton', fontSize:'130px', margin:'12px 0 0', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.92}}>
            We perform <span style={{color:'#F5A623'}}>with</span><br/>students — not <span style={{color:'#C7238E'}}>at</span> them.
          </h1>
          <p style={{fontFamily:'Inter', fontSize:'20px', color:'#B8B8C0', lineHeight:1.55, maxWidth:'760px', marginTop:'32px'}}>
            Urban Gang Tour (UGT) is a high school talent search, mentorship, awards, and concert programme that goes directly into Kenyan institutions — not to entertain, but to discover talent, nurture dreams, build confidence, and leave behind a legacy that lasts long after we leave the school gates.
          </p>
        </div>
      </section>
      <section style={{background:'#fff', padding:'70px 36px'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'50px'}}>
          <div>
            <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'28px', color:'#C7238E', transform:'rotate(-3deg)'}}>our story</div>
            <h2 style={{fontFamily:'Anton', fontSize:'60px', margin:'10px 0', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.95}}>Born from one question.</h2>
          </div>
          <div>
            <p style={{fontFamily:'Inter', fontSize:'18px', color:'#1A1A1A', lineHeight:1.6, marginBottom:16}}>Every young person in Kenya has potential. The question is: <em>who will help them find their purpose?</em></p>
            <p style={{fontFamily:'Inter', fontSize:'17px', color:'#3A3A3A', lineHeight:1.65, marginBottom:16}}>UGT was born from that question. We're not in the business of just entertaining. We're here to educate, inform, nurture, and give young people a reason to believe, a reason to hope, and a reason to chase their dreams.</p>
            <p style={{fontFamily:'Inter', fontSize:'17px', color:'#3A3A3A', lineHeight:1.65}}>We go into high schools, universities, colleges, and tertiary institutions countrywide. Every event becomes a 25–30 minute episode on Urban News, PPP TV Kenya — broadcast to up to 8 million viewers. Every event leaves behind an Urban Gang Club with elected student leadership. Every event is a seed.</p>
          </div>
        </div>
      </section>
      <section style={{background:'#FDF0F7', padding:'70px 36px', borderTop:'3px solid #1A1A1A', borderBottom:'3px solid #1A1A1A'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto'}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'22px'}}>
            {[['Vision','To become Kenya\'s largest and most impactful youth talent and mentorship tour — reaching every institution in the country and eventually hosting mega concerts, colour festivals, and nationwide events that unite young people across all communities.'],
              ['Mission','Discover. Nurture. Broadcast. Every school visited gets a full day programme, a dedicated TV episode, and a permanent Urban Gang Club. The impact compounds.'],
              ['What we do','Talent search, mentorship (Urban Pods), talent competitions across 9 categories, modelling showcases, awards, and a concert-grade headline performance — all in one day.'],
              ['Where we go','High schools, universities, colleges, tertiary institutions — and expanding into mega concerts, colour festivals, church missions, and community events countrywide.'],
            ].map(([h,p])=>(
              <div key={h} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'18px', padding:'24px', boxShadow:'6px 6px 0 #C7238E'}}>
                <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'24px', textTransform:'uppercase', color:'#C7238E'}}>{h}</div>
                <p style={{fontFamily:'Inter', fontSize:'15px', color:'#1A1A1A', lineHeight:1.6, marginTop:10}}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{background:'#1A1A1A', color:'#fff', padding:'70px 36px'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>The follow-up programme</div>
          <h2 style={{fontFamily:'Anton', fontSize:'56px', margin:'10px 0 20px', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.95}}>The event day is not the end.</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'18px'}}>
            {[['Week 1','TV Feature','2 winners from each school hosted live on Urban News, PPP TV Kenya.'],
              ['Week 2','Urban Gang Club','Elected student leadership. Our permanent presence in every school.'],
              ['Weeks 3–4','Church Conference Day','Winners from all toured schools reunite at Destiny Life Church grounds.'],
              ['Ongoing','Alumni Network','Progress tracking. Repeat visits. Countrywide growth.'],
            ].map(([w,h,p])=>(
              <div key={w} style={{border:'3px solid #fff', borderRadius:'16px', padding:'20px', background:'#0A0A0A'}}>
                <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'13px', color:'#F5A623', letterSpacing:'.1em'}}>{w}</div>
                <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'20px', marginTop:6, textTransform:'uppercase'}}>{h}</div>
                <p style={{fontFamily:'Inter', fontSize:'13px', color:'#B8B8C0', lineHeight:1.55, marginTop:10}}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------- SchoolsIndex ----------
function SchoolsIndex({ onOpenSchool, onApply }) {
  const schools = window.UGT_DATA?.schools || [];
  return (
    <div style={{background:'#fff', minHeight:'100vh'}}>
      <section style={{background:'#C7238E', padding:'80px 36px', position:'relative', overflow:'hidden', borderBottom:'3px solid #1A1A1A'}}>
        <div style={{maxWidth:'1200px', margin:'0 auto', position:'relative'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>2nd Term 2026</div>
          <h1 style={{fontFamily:'Anton', fontSize:'120px', color:'#fff', margin:'12px 0 12px', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.92}}>
            The <span style={{color:'#F5A623'}}>Schools.</span>
          </h1>
          <p style={{fontFamily:'Inter', fontSize:'19px', color:'#fff', maxWidth:'700px', lineHeight:1.5}}>Three confirmed for this term. Each school gets a dedicated page, its own Urban News episode, and a permanent Urban Gang Club with elected student leadership.</p>
        </div>
      </section>
      <section style={{padding:'70px 36px', background:'#FDF0F7'}}>
        <div style={{maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'24px'}}>
          {schools.map((s,i)=>(
            <div key={s.id} onClick={()=>onOpenSchool(s.id)} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'22px', padding:'26px', boxShadow:'8px 8px 0 #1A1A1A', cursor:'pointer', transform:`rotate(${i%2?1:-1}deg)`, transition:'transform .2s'}}
              onMouseEnter={(e)=>e.currentTarget.style.transform=`rotate(${i%2?1:-1}deg) translateY(-6px)`}
              onMouseLeave={(e)=>e.currentTarget.style.transform=`rotate(${i%2?1:-1}deg)`}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'13px', color:'#6B6B6B', letterSpacing:'.12em'}}>EVENT #{s.eventNo}</div>
                <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'10px', padding:'4px 10px', borderRadius:'999px', background:s.color, color:'#fff', letterSpacing:'.14em', border:'2px solid #1A1A1A'}}>{s.status}</div>
              </div>
              <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'36px', color:'#1A1A1A', lineHeight:1}}>{s.dateShort}</div>
              <div style={{height:'8px', background:s.color, width:'50%', margin:'10px 0 16px', borderRadius:'2px'}}/>
              <h3 style={{fontFamily:'Anton', fontSize:'32px', color:'#1A1A1A', textTransform:'uppercase', letterSpacing:'-0.01em', lineHeight:1, margin:0}}>{s.name}</h3>
              <div style={{fontFamily:'Inter', fontWeight:700, fontSize:'13px', color:'#6B6B6B', marginTop:6}}>{s.town}</div>
              <p style={{fontFamily:'Inter', fontSize:'14px', color:'#3A3A3A', lineHeight:1.6, marginTop:14}}>{s.blurb}</p>
              <div style={{marginTop:18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'18px', color:s.color}}>"{s.theme}"</div>
                <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'12px', color:'#C7238E', letterSpacing:'.14em'}}>OPEN →</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{maxWidth:'1200px', margin:'40px auto 0', textAlign:'center'}}>
          <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'28px', color:'#1A1A1A', transform:'rotate(-2deg)', marginBottom:16}}>Want your school on the list?</div>
          <button onClick={onApply} style={{fontFamily:'Inter', fontWeight:900, fontSize:'14px', letterSpacing:'.1em', textTransform:'uppercase', padding:'16px 28px', border:'3px solid #1A1A1A', borderRadius:'999px', background:'#C7238E', color:'#fff', boxShadow:'6px 6px 0 #F5A623', cursor:'pointer'}}>Apply for a visit →</button>
        </div>
      </section>
    </div>
  );
}

// ---------- SchoolPage (template-driven, one per school) ----------
function SchoolPage({ schoolId, onBack, onApply }) {
  const s = (window.UGT_DATA?.schools || []).find(x=>x.id===schoolId);
  if (!s) return <div style={{padding:60, fontFamily:'Inter'}}>School not found. <a href="#" onClick={onBack}>Back</a></div>;
  const runOfShow = [
    ['5:00 AM','Stage, sound & light setup','DLC crew · Faly Mark'],
    ['8:10','Urban Pods · 5 breakouts','All professionals'],
    ['9:20','Tree planting','Tai · Green Movement'],
    ['10:00','Church opening · Tribez','Destiny Life Church'],
    ['10:55','Talent pt. 1 · Choir · Gospel · Poetry','Student performers · Kalamu Nyeusi'],
    ['12:40','Drama · Lunch · TV segments','Eugine · Lucy · Lallez'],
    ['1:40','Clubs rivalry · Rap','School clubs · DJ Xavi'],
    ['2:30','Curtain raiser · dance','Guest Musician #1'],
    ['3:30','Modelling showcase · 4 runways','MC Paps · Fred'],
    ['4:47','Church moment · Teacher dance','DLC speaker · MCs'],
    ['5:10','Headline performance','Guest Musician #2'],
    ['5:25','Awards ceremony','Eugine · Lucy · Principal'],
  ];
  return (
    <div>
      <section style={{background:'#0A0A0A', color:'#fff', padding:'70px 36px 60px', position:'relative', overflow:'hidden', borderBottom:`6px solid ${s.color}`}}>
        <div style={{position:'absolute', inset:0, background:`radial-gradient(ellipse 700px 500px at 30% 0%, ${s.color}88, transparent 60%)`}}/>
        <div style={{maxWidth:'1150px', margin:'0 auto', position:'relative'}}>
          <button onClick={onBack} style={{fontFamily:'Inter', fontWeight:900, fontSize:'12px', letterSpacing:'.14em', textTransform:'uppercase', color:'#F5A623', background:'transparent', border:'none', cursor:'pointer', marginBottom:'20px'}}>← All schools</button>
          <div style={{display:'inline-block', fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.14em', padding:'6px 12px', borderRadius:'999px', background:s.color, color:'#fff', border:'2px solid #fff'}}>{s.status} · EVENT #{s.eventNo}</div>
          <h1 style={{fontFamily:'Anton', fontSize:'120px', margin:'18px 0 10px', letterSpacing:'-0.02em', textTransform:'uppercase', lineHeight:.9}}>{s.name}</h1>
          <div style={{display:'flex', gap:24, flexWrap:'wrap', marginTop:20}}>
            <KV k="Event Date" v={s.date} color={s.color}/>
            <KV k="Location" v={s.town} color={s.color}/>
            <KV k="Students (est.)" v={s.studentEstimate} color={s.color}/>
            <KV k="Theme" v={`"${s.theme}"`} color={s.color}/>
          </div>
          <p style={{fontFamily:'Inter', fontSize:'18px', color:'#E8E8ED', maxWidth:'760px', marginTop:'28px', lineHeight:1.55}}>{s.blurb}</p>
        </div>
      </section>

      <section style={{background:'#FDF0F7', padding:'60px 36px', borderBottom:'3px solid #1A1A1A'}}>
        <div style={{maxWidth:'1150px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px'}}>
          {[['Host', 'Eugine & Lucy'],['Motto', s.motto],['County', s.county],['Broadcast', 'Urban News · PPP TV']].map(([k,v])=>(
            <div key={k} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'14px', padding:'18px', boxShadow:'5px 5px 0 #C7238E'}}>
              <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'10px', letterSpacing:'.14em', textTransform:'uppercase', color:'#C7238E'}}>{k}</div>
              <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'18px', color:'#1A1A1A', marginTop:6, textTransform:'uppercase'}}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{background:'#fff', padding:'70px 36px'}}>
        <div style={{maxWidth:'1150px', margin:'0 auto'}}>
          <div style={{fontFamily:'Inter', fontWeight:800, fontSize:'12px', letterSpacing:'.18em', textTransform:'uppercase', color:'#C7238E'}}>Run of show</div>
          <h2 style={{fontFamily:'Anton', fontSize:'60px', margin:'10px 0 24px', textTransform:'uppercase', letterSpacing:'-0.02em'}}>12.5 hours. <span style={{color:s.color}}>One school.</span></h2>
          <table style={{width:'100%', borderCollapse:'collapse', border:'3px solid #1A1A1A', borderRadius:'14px', overflow:'hidden'}}>
            <thead style={{background:s.color, color:'#fff'}}>
              <tr><th style={th}>Time</th><th style={th}>Segment</th><th style={th}>Lead</th></tr>
            </thead>
            <tbody>
              {runOfShow.map((r,i)=>(
                <tr key={i} style={{background: i%2?'#FDF0F7':'#fff'}}>
                  <td style={{...td, fontFamily:'ui-monospace, monospace', color:s.color, fontWeight:900}}>{r[0]}</td>
                  <td style={{...td, fontWeight:700}}>{r[1]}</td>
                  <td style={{...td, color:'#3A3A3A'}}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{background:'#1A1A1A', padding:'70px 36px', color:'#fff'}}>
        <div style={{maxWidth:'1150px', margin:'0 auto'}}>
          <div style={{fontFamily:'Inter', fontWeight:800, fontSize:'12px', letterSpacing:'.18em', textTransform:'uppercase', color:'#F5A623'}}>Competition categories</div>
          <h2 style={{fontFamily:'Anton', fontSize:'52px', margin:'10px 0 24px', textTransform:'uppercase', letterSpacing:'-0.02em'}}>9 categories. Certificates. Hampers. A national TV feature for every winner.</h2>
          <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
            {(window.UGT_DATA?.categories||[]).map(c=>(
              <span key={c} style={{fontFamily:'Archivo Black, sans-serif', fontSize:'16px', textTransform:'uppercase', padding:'10px 18px', borderRadius:'999px', border:`3px solid ${s.color}`, color:'#fff'}}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section style={{background:s.color, padding:'70px 36px', color:'#fff'}}>
        <div style={{maxWidth:'900px', margin:'0 auto', textAlign:'center'}}>
          <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'32px', transform:'rotate(-2deg)'}}>one more thing</div>
          <h2 style={{fontFamily:'Anton', fontSize:'72px', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.95, margin:'10px 0 18px'}}>Want your school next?</h2>
          <p style={{fontFamily:'Inter', fontSize:'18px', lineHeight:1.55, marginBottom:24}}>We're booking continuously and expanding countrywide.</p>
          <button onClick={onApply} style={{fontFamily:'Inter', fontWeight:900, fontSize:'14px', letterSpacing:'.1em', textTransform:'uppercase', padding:'16px 28px', border:'3px solid #fff', borderRadius:'999px', background:'#1A1A1A', color:'#fff', boxShadow:'6px 6px 0 #fff', cursor:'pointer'}}>Apply for a visit →</button>
        </div>
      </section>
    </div>
  );
}
function KV({k,v,color}) {
  return (<div><div style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.14em', textTransform:'uppercase', color:color}}>{k}</div><div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'18px', color:'#fff', marginTop:4, textTransform:'uppercase'}}>{v}</div></div>);
}

// ---------- TeamPage ----------
function TeamPage() {
  const hosts = window.UGT_DATA?.hosts || [];
  const team = window.UGT_DATA?.team || [];
  return (
    <div style={{background:'#fff', minHeight:'100vh'}}>
      <section style={{background:'#0A0A0A', color:'#fff', padding:'80px 36px 60px', position:'relative', overflow:'hidden', borderBottom:'3px solid #C7238E'}}>
        <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse 700px 400px at 50% 0%, rgba(199,35,142,.5), transparent 60%)'}}/>
        <div style={{maxWidth:'1200px', margin:'0 auto', position:'relative', textAlign:'center'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>The Crew · 30+ on event day</div>
          <h1 style={{fontFamily:'Anton', fontSize:'130px', margin:'12px 0', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.92}}>Meet the <span style={{color:'#C7238E'}}>Gang.</span></h1>
          <p style={{fontFamily:'Inter', fontSize:'19px', color:'#B8B8C0', maxWidth:'700px', margin:'18px auto 0', lineHeight:1.55}}>Hosts, MCs, DJs, dancers, camera crew, sound engineers, security, and hype leads. Every person has a primary and secondary role for maximum impact.</p>
        </div>
      </section>
      <section style={{padding:'70px 36px', background:'#FDF0F7', borderBottom:'3px solid #1A1A1A'}}>
        <div style={{maxWidth:'1200px', margin:'0 auto'}}>
          <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'28px', color:'#C7238E', transform:'rotate(-2deg)', marginBottom:10}}>your hosts</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px'}}>
            {hosts.map((h,i)=>(
              <div key={h.name} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'22px', padding:'26px', boxShadow:'8px 8px 0 #C7238E', display:'grid', gridTemplateColumns:'180px 1fr', gap:22, alignItems:'center', transform:`rotate(${i?1:-1}deg)`}}>
                <div style={{width:'180px', height:'220px', borderRadius:'16px', border:'3px solid #1A1A1A', overflow:'hidden', background:i?'#C7238E':'#F5A623'}}>
                  <img src={'../../'+h.photo} alt={h.name} style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'top'}}/>
                </div>
                <div>
                  <div style={{fontFamily:'Anton', fontSize:'40px', textTransform:'uppercase', color:'#1A1A1A', lineHeight:.95}}>{h.name}</div>
                  <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'13px', color:'#C7238E', marginTop:6, textTransform:'uppercase', letterSpacing:'.08em'}}>{h.role}</div>
                  <p style={{fontFamily:'Inter', fontSize:'14px', color:'#3A3A3A', lineHeight:1.55, marginTop:10}}>{h.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:'70px 36px', background:'#fff'}}>
        <div style={{maxWidth:'1200px', margin:'0 auto'}}>
          <div style={{fontFamily:'Permanent Marker, cursive', fontSize:'28px', color:'#C7238E', transform:'rotate(-2deg)', marginBottom:10}}>the full crew</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'18px'}}>
            {team.map((t,i)=>(
              <div key={t.name} style={{background:'#FDF0F7', border:'3px solid #1A1A1A', borderRadius:'16px', padding:'0', boxShadow:'6px 6px 0 #1A1A1A', overflow:'hidden', transform:`rotate(${(i%3)-1}deg)`}}>
                <div style={{width:'100%', height:'200px', background:'#F5A623', overflow:'hidden', borderBottom:'3px solid #1A1A1A'}}>
                  <img src={'../../'+t.photo} alt={t.name} style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'top'}}/>
                </div>
                <div style={{padding:'14px 16px 16px'}}>
                  <div style={{fontFamily:'Archivo Black, sans-serif', fontSize:'17px', textTransform:'uppercase', color:'#1A1A1A', lineHeight:1.1}}>{t.name}</div>
                  <div style={{fontFamily:'Inter', fontWeight:800, fontSize:'11px', color:'#C7238E', marginTop:4, letterSpacing:'.08em', textTransform:'uppercase'}}>{t.role}</div>
                  <div style={{fontFamily:'Inter', fontSize:'12px', color:'#6B6B6B', marginTop:6, lineHeight:1.4}}>{t.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:'70px 36px', background:'#1A1A1A', color:'#fff'}}>
        <div style={{maxWidth:'1200px', margin:'0 auto'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>The Experience Hub · 30-person team</div>
          <h2 style={{fontFamily:'Anton', fontSize:'56px', margin:'10px 0 24px', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.95}}>Our hype partner.</h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            <div style={{borderRadius:'16px', overflow:'hidden', border:'3px solid #fff', boxShadow:'8px 8px 0 #C7238E'}}>
              <img src="../../assets/people/experience-hub-team.jpg" alt="Experience Hub" style={{width:'100%', display:'block'}}/>
            </div>
            <div style={{borderRadius:'16px', overflow:'hidden', border:'3px solid #fff', boxShadow:'8px 8px 0 #F5A623'}}>
              <img src="../../assets/people/experience-hub-team-2.jpg" alt="Experience Hub team" style={{width:'100%', display:'block'}}/>
            </div>
          </div>
          <p style={{fontFamily:'Inter', fontSize:'16px', color:'#B8B8C0', lineHeight:1.6, marginTop:20, maxWidth:'860px'}}>Led by Hype Ola with DJ Carian, 5 dancers (incl. Nyarangi and Jeff), and gospel hypeman Gig Real. On event day, the Experience Hub deploys 30+ people for three high-energy sets and continuous crowd activation.</p>
        </div>
      </section>
    </div>
  );
}

// ---------- NewsPage ----------
function NewsPage() {
  const items = window.UGT_DATA?.news || [];
  return (
    <div style={{background:'#fff', minHeight:'100vh'}}>
      <section style={{background:'#F5A623', padding:'70px 36px', borderBottom:'3px solid #1A1A1A'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#1A1A1A'}}>The Newsroom</div>
          <h1 style={{fontFamily:'Anton', fontSize:'120px', margin:'10px 0', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.92, color:'#1A1A1A'}}>News & <span style={{color:'#C7238E'}}>updates.</span></h1>
          <p style={{fontFamily:'Inter', fontSize:'18px', color:'#1A1A1A', maxWidth:'700px', lineHeight:1.55}}>Announcements, broadcast milestones, partnerships, and follow-up from every school we tour.</p>
        </div>
      </section>
      <section style={{padding:'60px 36px', background:'#FDF0F7'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'22px'}}>
          {items.map((n,i)=>(
            <article key={i} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'18px', padding:'26px', boxShadow:'6px 6px 0 #1A1A1A'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'10px', letterSpacing:'.14em', padding:'4px 10px', borderRadius:'999px', background:n.color, color:'#fff'}}>{n.tag}</div>
                <div style={{fontFamily:'ui-monospace, monospace', fontSize:'12px', color:'#6B6B6B'}}>{n.date}</div>
              </div>
              <h3 style={{fontFamily:'Anton', fontSize:'32px', color:'#1A1A1A', margin:0, lineHeight:1.05, textTransform:'uppercase', letterSpacing:'-0.01em'}}>{n.title}</h3>
              <p style={{fontFamily:'Inter', fontSize:'15px', color:'#3A3A3A', lineHeight:1.6, marginTop:12}}>{n.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- ContactPage ----------
function ContactPage() {
  return (
    <div style={{background:'#fff', minHeight:'100vh'}}>
      <section style={{background:'#0A0A0A', color:'#fff', padding:'80px 36px', borderBottom:'3px solid #C7238E'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto'}}>
          <div style={{fontFamily:'Inter',fontWeight:800,fontSize:'12px',letterSpacing:'.18em',textTransform:'uppercase',color:'#F5A623'}}>Talk to us</div>
          <h1 style={{fontFamily:'Anton', fontSize:'130px', margin:'10px 0', textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:.92}}>Let's <span style={{color:'#C7238E'}}>build.</span></h1>
          <p style={{fontFamily:'Inter', fontSize:'19px', color:'#B8B8C0', maxWidth:'700px', lineHeight:1.55}}>School bookings, sponsor conversations, partnership enquiries, press, or just hello — all roads start here.</p>
        </div>
      </section>
      <section style={{padding:'70px 36px', background:'#FDF0F7'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'26px'}}>
          {[
            ['Creative Director', 'Eugine Micah', 'euginemicah@gmail.com', '#C7238E'],
            ['Broadcast', 'Urban News on PPP TV Kenya', 'ppptv.co.ke', '#F5A623'],
            ['Merchandise', 'Official UGT merchandise', 'Branded drops and event wear', '#7B1FA2'],
            ['Headquarters', 'Nairobi, Kenya', 'Countrywide tours', '#2E7D32'],
          ].map(([k,v,sub,c],i)=>(
            <div key={k} style={{background:'#fff', border:'3px solid #1A1A1A', borderRadius:'18px', padding:'24px', boxShadow:'6px 6px 0 #1A1A1A'}}>
              <div style={{fontFamily:'Inter', fontWeight:900, fontSize:'11px', letterSpacing:'.14em', textTransform:'uppercase', color:c}}>{k}</div>
              <div style={{fontFamily:'Anton', fontSize:'34px', marginTop:8, textTransform:'uppercase', letterSpacing:'-0.01em', lineHeight:1.05}}>{v}</div>
              <div style={{fontFamily:'Inter', fontSize:'15px', color:'#3A3A3A', marginTop:6}}>{sub}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

window.ApplyPage = ApplyPage;
window.AboutPage = AboutPage;
window.SchoolsIndex = SchoolsIndex;
window.SchoolPage = SchoolPage;
window.TeamPage = TeamPage;
window.NewsPage = NewsPage;
window.ContactPage = ContactPage;
window.EventPage = SchoolsIndex; // legacy alias
const th = {textAlign:'left', padding:'12px 16px', fontSize:'11px', letterSpacing:'.12em', textTransform:'uppercase', fontWeight:900};
const td = {padding:'12px 16px', fontSize:'14px', borderTop:'1.5px solid #F1D7E6', fontFamily:'Inter'};
