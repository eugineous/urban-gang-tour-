// Shared by marketing and transactional layouts. Preserve readable Android
// desktop-viewport fallback without feeding CSS zoom back into its own input.
export const VIEWPORT_BOOTSTRAP = `(()=>{
let layoutWidth=0,orientationKey='',appliedZoom=1;
const update=()=>{try{
 if(document.activeElement?.matches('input,textarea,select')||(window.visualViewport?.scale||1)>1.05)return;
 const root=document.documentElement;
 const landscape=screen.orientation?.type?screen.orientation.type.startsWith('landscape'):typeof window.orientation==='number'?Math.abs(window.orientation)===90:matchMedia('(orientation:landscape)').matches;
 const short=Math.min(screen.width,screen.height||screen.width);
 const wide=Math.max(screen.width,screen.height||screen.width);
 const screenWidth=landscape?wide:short;
 const phone=(navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches)&&short<=600;
 const orientationKeyNow=landscape?'landscape':'portrait';
 // Read the unzoomed layout width only on load/rotation. Re-reading innerWidth
 // after applying zoom can increase the ratio on Android and create a loop.
 if(orientationKeyNow!==orientationKey){
  if(appliedZoom!==1){root.style.zoom='';appliedZoom=1;}
  layoutWidth=innerWidth;orientationKey=orientationKeyNow;
 }
 const wideLayout=phone&&layoutWidth>700&&layoutWidth>screenWidth*1.1;
 const zoom=wideLayout?Math.min(3,layoutWidth/screenWidth):1;
 if(zoom!==appliedZoom){root.style.zoom=zoom===1?'':String(zoom);appliedZoom=zoom;}
 root.style.setProperty('--ugt-phone-zoom',String(zoom));
 root.style.setProperty('--ugt-screen-height',Math.round(Math.min(innerHeight,window.visualViewport?.height||innerHeight))+'px');
 if(wideLayout)root.dataset.phoneViewport='wide';else delete root.dataset.phoneViewport;
}catch{}};
update();let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})};
addEventListener('resize',schedule);addEventListener('orientationchange',schedule);
window.visualViewport?.addEventListener('resize',schedule);
})();`;
