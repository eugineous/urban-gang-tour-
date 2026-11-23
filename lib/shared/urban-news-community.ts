export type CommunityReply={classification:'routine'|'source'|'correction'|'sensitive';humanReviewRequired:boolean;suggestions:string[]};
/** Free, deterministic draft suggestions. No API call, no autonomous posting. */
export function suggestUrbanNewsReplies(raw:unknown):CommunityReply{
 if(typeof raw!=='string'||raw.trim().length<2||raw.length>1200)throw Error('invalid_comment');
 const comment=raw.trim();
 // Do not answer threats, personal allegations or potentially distressing incidents automatically.
 if(/\b(kill|murder|rape|assault|suicide|bomb|attack|dox|private address|child abuse|sexual abuse)\b/i.test(comment)){
  return {classification:'sensitive',humanReviewRequired:true,suggestions:[]};
 }
 if(/\b(wrong|false|incorrect|mistake|correction|fix this|misleading|untrue|not true)\b/i.test(comment)){
  return {classification:'correction',humanReviewRequired:true,suggestions:[
   'Thank you for raising this. We will check the detail against the underlying evidence and correct the story if necessary.',
   'We appreciate the correction request. Our editorial team will review the claim before responding further.'
  ]};
 }
 if(/\b(source|evidence|proof|reference|link|verify|verified|citation|where did|how do you know)\b/i.test(comment)){
  return {classification:'source',humanReviewRequired:true,suggestions:[
   'Thank you for asking for evidence. We will confirm the underlying sources before giving a specific answer.',
   'That is a fair question. Our editorial team will review the supporting material and clarify where necessary.'
  ]};
 }
 return {classification:'routine',humanReviewRequired:false,suggestions:[
  'Thanks for reading and sharing your thoughts.',
  'We appreciate you joining the conversation. What stood out most to you?',
  'Thank you for following Urban News. We value your feedback.'
 ]};
}
