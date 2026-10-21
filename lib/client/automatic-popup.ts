const key='ugt-campaign-popup-session';
let shownThisVisit=false;
/** Share one automatic interruption across host invitations and campaigns. */
export function automaticPopupWasShown(){
 if(shownThisVisit)return true;
 try{return sessionStorage.getItem(key)==='shown'}catch{return false}
}
export function markAutomaticPopupShown(){
 shownThisVisit=true;
 try{sessionStorage.setItem(key,'shown')}catch{/* retain the cap for this document */}
}
