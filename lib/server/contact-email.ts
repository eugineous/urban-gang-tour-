import {q} from './db';
import {escapeEmailHtml,renderEmailLetterhead} from './email-letterhead';
import {validContactEmail,type ContactEnquiry} from './contact-enquiries';

// Existing public business mailbox, not a personal address inferred from chat.
const BUSINESS_MAILBOX='admin@urbangangtour.co.ke';
export async function contactEmailRecipients(){
 const rows=await q<{value:unknown}>(`SELECT value FROM settings WHERE key='notify_email'`);
 const configured=typeof rows[0]?.value==='string'?rows[0].value.trim():'';
 let owner=validContactEmail(configured)?configured:'';
 if(!owner){try{const gmail=await q<{meta:unknown}>(`SELECT meta FROM admin_integrations WHERE id='gmail'`);const meta=typeof gmail[0]?.meta==='string'?JSON.parse(gmail[0].meta):gmail[0]?.meta;const email=meta&&typeof meta==='object'&&'email' in meta?String(meta.email):'';if(validContactEmail(email))owner=email;}catch{/* A Gmail connection is optional; never infer a personal inbox. */}}
 if(!owner)throw Error('contact_recipient_not_configured');
 const explicit=(process.env.BOOKINGS_TO||'').split(',').map(value=>value.trim()).find(value=>validContactEmail(value)&&/@urbangangtour\.co\.ke$/i.test(value));
 const copy=explicit||BUSINESS_MAILBOX;
 return {to:owner,cc:owner.toLowerCase()===copy.toLowerCase()?undefined:copy};
}
export async function renderContactEmailPayload(enquiry:ContactEnquiry,reference:string){
 const recipients=await contactEmailRecipients();
 const from=process.env.BOOKINGS_FROM||'Urban Gang Tour <admin@urbangangtour.co.ke>';
 const sender=from.match(/^[^<>\r\n]{1,80}<([^<>]+)>$/)?.[1]||from;
 if(!validContactEmail(sender)||/[\r\n]/.test(from))throw Error('contact_sender_not_configured');
 const esc=escapeEmailHtml;
 const rows=[['Reference',reference],['Name',enquiry.name],['Email',enquiry.email],['Subject',enquiry.subject]];
 const html=renderEmailLetterhead({title:'New website enquiry',eyebrow:'Contact desk',previewText:'A new website enquiry needs a reply.',contentHtml:`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">${rows.map(([key,value])=>`<tr><td style="padding:5px 12px 5px 0;vertical-align:top;color:#655c63">${esc(key)}</td><td style="padding:5px 0;overflow-wrap:anywhere;word-break:break-word">${esc(value)}</td></tr>`).join('')}</table><h2 style="font-size:18px;margin:24px 0 10px">Message</h2><p style="white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word">${esc(enquiry.message)}</p><p style="font-size:13px;color:#655c63">Reply to this email to contact the sender. The enquiry is also saved in the Control Room’s Bookings desk.</p><p><a href="https://urbangangtour.co.ke/admin?tab=Bookings" style="display:inline-block;background:#941358;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Open the enquiry desk</a></p>`});
 return JSON.stringify({from,...recipients,reply_to:enquiry.email,subject:`Website enquiry: ${enquiry.subject}`,text:`New website enquiry\n\n${rows.map(([key,value])=>`${key}: ${value}`).join('\n')}\n\n${enquiry.message}\n\nReply to this email to contact the sender.\nControl Room: https://urbangangtour.co.ke/admin?tab=Bookings\n\nUrban Gang Tour · Nairobi, Kenya`,html});
}
