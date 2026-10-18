/** Contextual promotions must not interrupt input, consent or another overlay. */
export function campaignCanInterrupt({hidden,editing,otherOverlay,privacyReady,paused}:{hidden:boolean;editing:boolean;otherOverlay:boolean;privacyReady:boolean;paused:boolean}){
 return !hidden&&!editing&&!otherOverlay&&privacyReady&&!paused;
}
