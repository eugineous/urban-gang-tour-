'use client';
import type {DraftEntry} from '@/lib/client/reply-draft-store';
export default function ReplyDraftStatus({entry,onSave,onClear,onRetry}:{entry:DraftEntry|null;onSave:()=>void;onClear:()=>void;onRetry:()=>void}){
 if(!entry)return null;
 const label=entry.status==='saved'?(entry.version?(entry.subject||entry.body?'Draft saved privately.':'Draft cleared.'):'No saved draft yet.'):entry.status==='loading'?'Loading saved draft…':entry.status==='saving'?'Saving draft…':entry.status==='conflict'?'Another tab changed this draft. Your text is kept here; copy it before reloading.':entry.status==='error'?'Draft not saved. Your text is kept here.':'Changes not saved yet.';
 return <div className="reply-draft-status"><p role="status">{label}</p><div><button type="button" onClick={entry.loaded?onSave:onRetry} disabled={entry.status==='saving'||entry.status==='conflict'}>{entry.loaded?'Save draft now':'Retry loading draft'}</button> <button type="button" onClick={onClear} disabled={!entry.loaded||entry.status==='saving'||entry.status==='conflict'}>Clear draft</button></div><small>Saved drafts return after refresh. Clearing a draft does not cancel or resend an email.</small></div>;
}
