import {beforeEach,it,expect,vi} from 'vitest';
const f=vi.hoisted(()=>({q:vi.fn(),schema:vi.fn().mockResolvedValue(undefined),send:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:f.q,qSchema:f.schema}));
vi.mock('@/lib/server/gmail',()=>({sendGmailMessage:f.send}));
import {sendGmailOnce} from '@/lib/server/gmail-send-attempt';
const input={to:'person@example.com',subject:'Reply',body:'Hello'};
beforeEach(()=>{f.q.mockReset();f.send.mockReset()});
it('acknowledges only after provider and durable record agree',async()=>{
 f.q.mockResolvedValueOnce([{id:'claim'}]).mockResolvedValueOnce([{id:'claim'}]);f.send.mockResolvedValue({id:'gmail-id',threadId:'thread'});
 expect(await sendGmailOnce('staff','a'.repeat(32),input)).toMatchObject({id:'gmail-id',deduped:false});expect(f.send).toHaveBeenCalledTimes(1);
});
it('uncertain sends cannot be resent',async()=>{
 const {createHash}=await import('node:crypto');const hash=createHash('sha256').update(JSON.stringify({...input,threadId:'',inReplyTo:'',references:''})).digest('hex');
 f.q.mockResolvedValueOnce([]).mockResolvedValueOnce([{request_hash:hash,status:'unknown'}]);
 await expect(sendGmailOnce('staff','a'.repeat(32),input)).rejects.toThrow('gmail_send_outcome_unknown');expect(f.send).not.toHaveBeenCalled();
});
it('a lost durable acknowledgement is not reported as accepted',async()=>{
 f.q.mockResolvedValueOnce([{id:'claim'}]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);f.send.mockResolvedValue({id:'gmail-id'});
 await expect(sendGmailOnce('staff','a'.repeat(32),input)).rejects.toThrow('gmail_send_outcome_unknown');expect(f.send).toHaveBeenCalledTimes(1);
});
