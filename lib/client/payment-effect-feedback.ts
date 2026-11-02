export function effectFeedback(status:string):{label:string;review:boolean}{
 const labels:Record<string,string>={queued:'Queued for preparation',processing:'Preparing',complete:'Preparation complete',skipped:'Not required',blocked:'Needs operator review'};
 return {label:labels[status]||'Status unavailable',review:status==='blocked'||!Object.hasOwn(labels,status)};
}

export function emailRetryFeedback(outcome:unknown):string{
 if(outcome==='accepted')return 'The email service accepted this message. This does not confirm inbox delivery.';
 if(outcome==='queued')return 'The message is saved and queued for another delivery attempt.';
 if(outcome==='not_due')return 'No new message was sent by this request. Check the saved delivery status below.';
 if(['blocked','failed','manual_review_required'].includes(String(outcome)))return 'This message needs operator review. Do not keep retrying it.';
 return 'Email retry could not be confirmed. Refresh its status before trying again.';
}
