import Link from 'next/link';

export default function NotFound() {
  return (
    <section style={{background:'var(--ugt-bg-dark)',minHeight:'80vh',display:'flex',alignItems:'center',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:'var(--grad-stage-glow)',pointerEvents:'none'}} />
      <div className="container" style={{position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(120px,20vw,240px)',color:'var(--ugt-magenta)',lineHeight:1,opacity:0.15}}>404</div>
        <h1 className="h-display h-md" style={{color:'var(--ugt-white)',marginTop:'-40px',marginBottom:'16px'}}>This page doesn&apos;t exist.</h1>
        <p style={{color:'rgba(255,255,255,0.55)',fontSize:'18px',marginBottom:'32px'}}>But the tour does. Head back and find what you were looking for.</p>
        <Link href="/" className="btn btn-magenta btn-lg">Back to home</Link>
      </div>
    </section>
  );
}
