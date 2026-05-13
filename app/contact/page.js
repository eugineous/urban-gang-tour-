'use client';
import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({name:'',email:'',phone:'',type:'school',message:''});
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = `Hi, I'm ${form.name}.\n\nType: ${form.type}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`;
    window.open(`https://wa.me/254799886247?text=${encodeURIComponent(msg)}`, '_blank');
    setSent(true);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div className="eyebrow" style={{color:'var(--ugt-orange)',marginBottom:'12px'}}>Talk to Eugine and Lucy</div>
          <h1 className="h-display h-lg" style={{color:'var(--ugt-white)',marginBottom:'16px'}}>Let&apos;s get<br />to work.</h1>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:'var(--fs-body-lg)',maxWidth:'600px',lineHeight:'var(--lh-loose)'}}>Whether you are a principal bringing the tour to your school, a brand exploring activation, a campus admin curious about the university edition, or an artist who wants to be on stage with us — this is where it starts. Eugine and Lucy lead every conversation personally.</p>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-inner fast">
          {['School bookings','University stops','Sponsor packages','Media requests','Join the crew','Apply to perform','24-hour response'].map((t,i) => (
            <div key={i} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
          {['School bookings','University stops','Sponsor packages','Media requests','Join the crew','Apply to perform','24-hour response'].map((t,i) => (
            <div key={`b${i}`} className="ticker-item">{t} <span className="ticker-sep">*</span></div>
          ))}
        </div>
      </div>

      <section className="section" style={{background:'var(--ugt-bg)'}}>
        <div className="container">
          <div className="grid-2 reveal" style={{gap:'64px',alignItems:'start'}}>
            <div>
              <div className="eyebrow" style={{marginBottom:'16px'}}>Send a message</div>
              <h2 className="h-display h-md" style={{color:'var(--ugt-ink)',marginBottom:'32px'}}>Start the<br />conversation.</h2>
              {sent ? (
                <div style={{background:'var(--ugt-magenta-soft)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'40px',boxShadow:'var(--shadow-sticker-magenta)'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'32px',color:'var(--ugt-magenta)',marginBottom:'12px'}}>Message sent.</div>
                  <p style={{color:'var(--ugt-ink-2)',fontSize:'16px',lineHeight:1.7}}>Your message has been opened in WhatsApp. Eugine and Lucy will respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'20px'}}>
                  <div className="form-group">
                    <label htmlFor="name">Your name</label>
                    <input id="name" type="text" placeholder="Full name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" placeholder="your@email.com" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone / WhatsApp</label>
                    <input id="phone" type="tel" placeholder="+254..." value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="type">I am reaching out about</label>
                    <select id="type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                      <option value="school">School booking</option>
                      <option value="university">University / college stop</option>
                      <option value="sponsor">Sponsorship / brand activation</option>
                      <option value="media">Media collaboration</option>
                      <option value="crew">Joining the crew</option>
                      <option value="perform">Applying to perform</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Message</label>
                    <textarea id="message" placeholder="Tell us what you have in mind..." required value={form.message} onChange={e=>setForm({...form,message:e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-magenta btn-lg" style={{alignSelf:'flex-start'}}>Send via WhatsApp →</button>
                </form>
              )}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
              <div className="eyebrow" style={{marginBottom:'4px'}}>Direct contact</div>
              {[
                {label:'WhatsApp',value:'+254799886247',href:'https://wa.me/254799886247'},
                {label:'Email',value:'euginemicah@gmail.com',href:'mailto:euginemicah@gmail.com'},
                {label:'Instagram',value:'@urban_newsgang',href:'https://instagram.com/urban_newsgang'},
              ].map(c => (
                <a key={c.label} href={c.href} target="_blank" rel="noopener" style={{background:'var(--ugt-white)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'24px 28px',boxShadow:'var(--shadow-sticker-xs)',display:'flex',flexDirection:'column',gap:'4px',transition:'transform var(--dur-base),box-shadow var(--dur-base)'}}>
                  <div style={{fontSize:'11px',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ugt-magenta)'}}>{c.label}</div>
                  <div style={{fontFamily:'var(--font-display-alt)',fontSize:'18px',textTransform:'uppercase',color:'var(--ugt-ink)'}}>{c.value}</div>
                </a>
              ))}
              <div style={{background:'var(--ugt-magenta)',border:'var(--border-bold)',borderRadius:'var(--r-xl)',padding:'28px',boxShadow:'var(--shadow-sticker-magenta)',marginTop:'8px'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'22px',color:'var(--ugt-white)',lineHeight:1.1,letterSpacing:'var(--tracking-crunch)',textTransform:'uppercase',marginBottom:'12px'}}>"We respond within 24 hours. Every time."</div>
                <div style={{fontSize:'13px',color:'rgba(255,255,255,0.75)'}}>Eugine Micah · Co-Founder</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
