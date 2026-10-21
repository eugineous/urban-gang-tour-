import {campaignsAllowedOn} from '@/lib/marketing-campaigns';
export const INVITATION_DISMISSED_KEY='ugt-booking-invitation-dismissed-v2';
export const INVITATION_COOLDOWN_MS=24*60*60*1000;
export function invitationAllowedOn(path:string){return campaignsAllowedOn(path)&&path!=='/contact-us'}
export function invitationCanOpen(context:{eligible:boolean;privacyReady:boolean;hidden:boolean;editing:boolean;otherOverlay:boolean;fullscreen:boolean;focusView:boolean;width:number}){
 return context.eligible&&context.privacyReady&&!context.hidden&&!context.editing&&!context.otherOverlay&&!context.fullscreen&&!context.focusView&&context.width>=280;
}
export function invitationWasDismissed(at:unknown,now:number){
 const time=Number(at);
 return Number.isFinite(time)&&time>0&&time<=now&&now-time<INVITATION_COOLDOWN_MS;
}
