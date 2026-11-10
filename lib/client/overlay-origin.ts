/** Visual enhancement only; existing components own dialog, focus and transaction state. */
const overlays='dialog,.lightbox[role="dialog"],.film-viewer[role="dialog"],[data-ugt-dialog]';
const controls='button,a[href],summary,[role="button"]';
type Activation={x:number;y:number;at:number};
export function installOverlayOrigins(doc:Document){
 const view=doc.defaultView;if(!view)return()=>{};
 let activation:Activation|null=null;
 const touched=new Map<HTMLElement,{x:string;y:string;origin:string|null}>(),active=new WeakSet<HTMLElement>();
 const release=(element:HTMLElement)=>{const previous=touched.get(element);if(!previous)return;for(const [property,value] of [['--ugt-origin-x',previous.x],['--ugt-origin-y',previous.y]]){if(value)element.style.setProperty(property,value);else element.style.removeProperty(property)}if(previous.origin===null)element.removeAttribute('data-ugt-overlay-origin');else element.setAttribute('data-ugt-overlay-origin',previous.origin);touched.delete(element);active.delete(element)};
 const remember=(event:Event)=>{
  if(event instanceof view.KeyboardEvent&&!['Enter',' '].includes(event.key))return;
  const target=event.target instanceof view.Element?event.target.closest(controls):null;
  if(!(target instanceof view.HTMLElement)||target.getAttribute('aria-disabled')==='true'||target.matches(':disabled'))return;
  const box=target.getBoundingClientRect();if(box.width&&box.height)activation={x:box.left+box.width/2,y:box.top+box.height/2,at:view.performance.now()};
 };
 const enhance=(element:Element)=>{
  if(!(element instanceof view.HTMLElement)||!element.matches(overlays))return;
  if(element instanceof view.HTMLDialogElement&&!element.open){active.delete(element);return}
  if(active.has(element)||!element.getClientRects().length)return;
  if(!touched.has(element))touched.set(element,{x:element.style.getPropertyValue('--ugt-origin-x'),y:element.style.getPropertyValue('--ugt-origin-y'),origin:element.getAttribute('data-ugt-overlay-origin')});
  element.removeAttribute('data-ugt-overlay-origin');
  const box=element.getBoundingClientRect();if(!box.width||!box.height)return;
  const source=element.dataset.ugtOriginPolicy!=='automatic'&&activation&&view.performance.now()-activation.at<1000?activation:null;
  element.style.setProperty('--ugt-origin-x',source?((source.x-box.left)/box.width*100)+'%':'50%');
  element.style.setProperty('--ugt-origin-y',source?((source.y-box.top)/box.height*100)+'%':'50%');
  element.setAttribute('data-ugt-overlay-origin',source?'trigger':'center');active.add(element);
 };
 const scan=(element:Element)=>{enhance(element);element.querySelectorAll(overlays).forEach(enhance)};
 const observer=new view.MutationObserver(records=>{for(const record of records){if(record.type==='attributes')enhance(record.target as Element);else{for(const node of record.addedNodes)if(node instanceof view.Element)scan(node);for(const node of record.removedNodes)if(node instanceof view.HTMLElement&&!node.isConnected){release(node);node.querySelectorAll<HTMLElement>(overlays).forEach(release)}}}});
 doc.addEventListener('click',remember,true);doc.addEventListener('keydown',remember,true);
 observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});doc.querySelectorAll(overlays).forEach(enhance);
 return()=>{observer.disconnect();doc.removeEventListener('click',remember,true);doc.removeEventListener('keydown',remember,true);for(const element of touched.keys())release(element);activation=null};
}
