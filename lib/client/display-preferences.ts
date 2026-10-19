export const FOCUS_VIEW_KEY='ugt-new-preview-v1focusView';
// Apply before first paint; no cookies, tracking, locale redirects or server
// cache variation. The existing media hooks read the same preference.
export const DISPLAY_PREFERENCES_BOOTSTRAP=`(()=>{try{document.documentElement.dataset.focusView=String(JSON.parse(localStorage.getItem('${FOCUS_VIEW_KEY}')||'false')===true)}catch{}})();`;
export function setFocusView(value:boolean){
 try{localStorage.setItem(FOCUS_VIEW_KEY,JSON.stringify(value))}catch{/* still works for this page */}
 document.documentElement.dataset.focusView=String(value);
 window.dispatchEvent(new CustomEvent('ugt-focus-view',{detail:value}));
}
