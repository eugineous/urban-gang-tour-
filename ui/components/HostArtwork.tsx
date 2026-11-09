import styles from './MobileAppHero.module.css';
/** Hero prints are part of the shirt artwork, never floating overlay layers. */
export function HostArtwork({hero=false}:{hero?:boolean}){return <span className={hero?styles.portrait:styles.welcomeArtwork} data-host-artwork={hero?'hero':'welcome'}>
 <picture><source media="(max-width:767px), (max-device-width:600px) and (pointer:coarse)" srcSet={hero?'/assets/mobile/hosts-printed-mono.webp':'/assets/mobile/hosts-welcome-clean.webp'}/><img src="/icon-48.png" width={hero?850:700} height={hero?1133:700} alt={hero?'Illustrated portrait of Eugine Micah and Lucy Ogunde in black T-shirts':'Colour promotional illustration of Eugine and Lucy welcoming you, wearing Urban Gang Tour T-shirts'} loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'}/></picture>
 {!hero&&<><img className={styles.shirtLogo+' '+styles.lucyLogo} data-exact-shirt-logo src="/assets/ugt-logo.png" alt="" aria-hidden="true"/><img className={styles.shirtLogo+' '+styles.eugineLogo} data-exact-shirt-logo src="/assets/ugt-logo.png" alt="" aria-hidden="true"/></>}
 </span>}
