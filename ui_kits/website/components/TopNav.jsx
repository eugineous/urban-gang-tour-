// TopNav + shared primitives
function TopNav({ onNav, route }) {
  const items = [
    ['home','Home'],
    ['about','About'],
    ['schools','Schools'],
    ['team','The Crew'],
    ['news','News'],
    ['sponsor','Sponsors'],
    ['contact','Contact'],
  ];
  return (
    <nav style={tnStyles.nav}>
      <a href="#" onClick={(e)=>{e.preventDefault();onNav('home');}} style={tnStyles.brand}>
        <img src="../../assets/logos/ugt-logo-full.png" alt="Urban Gang Tour" style={tnStyles.logo}/>
      </a>
      <div style={tnStyles.links}>
        {items.map(([k,l])=>{
          const active = route===k || (route==='school' && k==='schools');
          return (
            <a key={k} href="#" onClick={(e)=>{e.preventDefault();onNav(k);}}
               style={{...tnStyles.link, color: active?'#C7238E':'#fff', textDecoration: active?'underline':'none', textUnderlineOffset:'6px', textDecorationThickness:'3px'}}>{l}</a>
          );
        })}
      </div>
      <button onClick={()=>onNav('apply')} style={tnStyles.cta}>Book Your School →</button>
    </nav>
  );
}

const tnStyles = {
  nav: { position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', background:'#0A0A0A', borderBottom:'3px solid #C7238E' },
  brand: { display:'flex', alignItems:'center' },
  logo: { height:'48px', width:'auto', filter:'drop-shadow(0 4px 10px rgba(199,35,142,.4))' },
  links: { display:'flex', gap:'22px' },
  link: { fontFamily:'Inter, sans-serif', fontWeight:900, fontSize:'12.5px', letterSpacing:'.12em', textTransform:'uppercase', color:'#fff', textDecoration:'none' },
  cta: { fontFamily:'Inter, sans-serif', fontWeight:900, fontSize:'12.5px', letterSpacing:'.1em', textTransform:'uppercase', padding:'11px 20px', borderRadius:'999px', border:'3px solid #fff', background:'#C7238E', color:'#fff', boxShadow:'5px 5px 0 #F5A623', cursor:'pointer' },
};

function Marquee({ text, bg='#C7238E', fg='#fff', accent='#F5A623' }) {
  const items = Array(6).fill(text);
  return (
    <div style={{background:bg, borderTop:'3px solid #1A1A1A', borderBottom:'3px solid #1A1A1A', overflow:'hidden', padding:'16px 0'}}>
      <div style={{display:'inline-block', whiteSpace:'nowrap', animation:'ugt-scroll 24s linear infinite', fontFamily:'Anton, sans-serif', fontSize:'44px', letterSpacing:'-0.01em', textTransform:'uppercase', color:fg}}>
        {items.map((t,i)=>(<span key={i}>{t}<span style={{color:accent, margin:'0 22px'}}>★</span></span>))}
      </div>
      <style>{`@keyframes ugt-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
    </div>
  );
}

window.TopNav = TopNav;
window.Marquee = Marquee;
