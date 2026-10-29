'use client';

import {useCallback,useRef,useState} from 'react';
import styles from './AdminNotice.module.css';

export type NoticeKind='error'|'success'|'info';
export type AdminNoticeValue={id:number;message:string;kind:NoticeKind};

export function noticeKind(message:string):NoticeKind {
 if(/failed|could not|couldn't|cannot|not confirmed|did not|error|unavailable|blocked|required|invalid|unable|retry|try again|missing|not found/i.test(message))return 'error';
 if(/^(saved|updated|generated|created|recorded|removed|retired|restored|sent|paid in full|payment recorded|voided|approved|published|uploaded)\b/i.test(message))return 'success';
 return 'info';
}

export function useAdminNotice():[AdminNoticeValue|null,(message:string,kind?:NoticeKind)=>void] {
 const [notice,setNotice]=useState<AdminNoticeValue|null>(null);
 const serial=useRef(0);
 const say=useCallback((message:string,kind?:NoticeKind)=>{
  setNotice(message?{id:++serial.current,message,kind:kind||noticeKind(message)}:null);
 },[]);
 return [notice,say];
}

/** No expiry: an error remains available until the staff member dismisses it. */
export function AdminNotice({notice}:{notice:AdminNoticeValue|null}) {
 const [dismissed,setDismissed]=useState<AdminNoticeValue|null>(null);
 if(!notice||notice===dismissed)return null;
 return <div className={styles.notice} data-kind={notice.kind} role={notice.kind==='error'?'alert':'status'} aria-live={notice.kind==='error'?'assertive':'polite'} aria-atomic="true">
  <span className={styles.message}>{notice.message}</span>
  <button type="button" className={styles.dismiss} aria-label="Dismiss notification" onClick={()=>setDismissed(notice)}><span aria-hidden="true">×</span></button>
 </div>;
}
