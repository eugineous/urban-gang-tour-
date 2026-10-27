import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const adapter=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn()}));
vi.mock('@/lib/server/db',()=>({...adapter,hasDb:()=>true}));
vi.mock('@/lib/server/receipt-email',()=>({renderReceiptEmailPayload:async()=>JSON.stringify({to:'fixture@example.test',subject:'Fixture receipt',html:'Frozen receipt'})}));
import {deliverReceiptEmailJob,enqueueReceiptEmail,ensureEmailOutbox,processEmailOutbox,retryEmailOutbox} from '@/lib/server/email-outbox';

const enabled=process.env.UGT_RECEIPT_PG_FIXTURE==='1',fixture=new DisposablePostgres();
beforeAll(async()=>{
 if(!enabled)return;
 if(process.env.UGT_EDITORIAL_SQL_CONTAINER!=='ugt-editorial-fixture-20261019')throw Error('fixture_target_not_allowlisted');
 fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 await fixture.schema('CREATE TABLE orders(id TEXT PRIMARY KEY,status TEXT,email TEXT)');
 adapter.q.mockImplementation(async(text:string,args:unknown[]=[])=>{
  const rows=await fixture.query(text,args);return rows.map(row=>({...row,...('attempts' in row?{attempts:Number(row.attempts)}:{})}));
 });
 adapter.qSchema.mockImplementation((text:string)=>fixture.schema(text));await ensureEmailOutbox();
},20000);
beforeEach(async()=>{
 if(!enabled)return;vi.stubEnv('RESEND_API_KEY','fixture-key');vi.stubGlobal('fetch',vi.fn(async()=>new Response('{"id":"fixture-provider-id"}',{status:200})));
 await fixture.query('TRUNCATE email_delivery_outbox,orders');
 await fixture.query("INSERT INTO orders(id,status,email) VALUES('fixture-order','paid','fixture@example.test')");
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
afterAll(()=>fixture.stop(),20000);
const test=it.skipIf(!enabled);
async function row(){return (await fixture.query('SELECT * FROM email_delivery_outbox'))[0]}

it('rejects an unapproved existing SQL target before contacting Docker',()=>{
 vi.stubEnv('UGT_EDITORIAL_SQL_CONTAINER','unapproved-fixture');
 expect(()=>new DisposablePostgres().start()).toThrow('fixture_target_not_allowlisted');
});

test('acceptance persists a valid provider ID and an accepted job never resends',async()=>{
 const id=await enqueueReceiptEmail('fixture-order');expect(await deliverReceiptEmailJob(id)).toBe('accepted');
 expect(await row()).toMatchObject({status:'accepted',provider_id:'fixture-provider-id',lease_token:null,lease_until:null,last_error:null,attempts:'1'});
 expect(await deliverReceiptEmailJob(id)).toBe('not_due');expect(fetch).toHaveBeenCalledTimes(1);
});
test.each([200,503])('a lease stolen during provider HTTP %i cannot alter the new owner',async status=>{
 const id=await enqueueReceiptEmail('fixture-order');
 vi.mocked(fetch).mockImplementation(async()=>{
  await fixture.query("UPDATE email_delivery_outbox SET lease_token='new-owner',last_error='new-owner-marker',provider_id='new-owner-provider' WHERE id=$1",[id]);
  return new Response('{"id":"old-owner-provider"}',{status});
 });
 expect(await deliverReceiptEmailJob(id)).toBe('lease_lost');
 expect(await row()).toMatchObject({status:'processing',lease_token:'new-owner',provider_id:'new-owner-provider',last_error:'new-owner-marker',attempts:'1'});
});
test('the processing status must still match even if the token was retained',async()=>{
 const id=await enqueueReceiptEmail('fixture-order');vi.mocked(fetch).mockImplementation(async()=>{
  await fixture.query("UPDATE email_delivery_outbox SET status='failed',last_error='manual_review_required' WHERE id=$1",[id]);
  return new Response('{"id":"fixture-provider-id"}',{status:200});
 });
 expect(await deliverReceiptEmailJob(id)).toBe('lease_lost');expect(await row()).toMatchObject({status:'failed',provider_id:null,last_error:'manual_review_required'});
});
test('a failed acceptance write retains the payload, original first send and key for the retry',async()=>{
 const id=await enqueueReceiptEmail('fixture-order');
 await fixture.schema("CREATE FUNCTION reject_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='accepted' THEN RAISE EXCEPTION 'fixture_acceptance_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_acceptance BEFORE UPDATE ON email_delivery_outbox FOR EACH ROW EXECUTE FUNCTION reject_acceptance()");
 try{
  expect(await deliverReceiptEmailJob(id)).toBe('queued');expect(await row()).toMatchObject({last_error:'provider_acceptance_unconfirmed',attempts:'1'});
 }finally{await fixture.schema('DROP TRIGGER reject_acceptance ON email_delivery_outbox;DROP FUNCTION reject_acceptance()')}
 const before=await row();await fixture.query('UPDATE email_delivery_outbox SET next_attempt_at=now() WHERE id=$1',[id]);
 expect(await deliverReceiptEmailJob(id)).toBe('accepted');const after=await row();
 expect(after.request_body).toBe(before.request_body);expect(after.first_send_at).toBe(before.first_send_at);expect(after.attempts).toBe('2');
 const first=vi.mocked(fetch).mock.calls[0][1]!,second=vi.mocked(fetch).mock.calls[1][1]!;
 expect(second.body).toBe(first.body);expect(second.headers).toEqual(first.headers);expect((second.headers as Record<string,string>)['Idempotency-Key']).toBe(id);
});
test.each(['attempts','window'])('stops %s-expired uncertain jobs for manual review without another send',async limit=>{
 const id=await enqueueReceiptEmail('fixture-order');
 await fixture.query(`UPDATE email_delivery_outbox SET ${limit==='attempts'?"attempts=8":"first_send_at=now()-interval '20 hours'"} WHERE id=$1`,[id]);
 expect(await deliverReceiptEmailJob(id)).toBe('not_due');expect(await retryEmailOutbox(id)).toBe('manual_review_required');
 expect(await processEmailOutbox()).toEqual([]);expect(await row()).toMatchObject({status:'failed',last_error:'manual_review_required'});expect(fetch).not.toHaveBeenCalled();
});
