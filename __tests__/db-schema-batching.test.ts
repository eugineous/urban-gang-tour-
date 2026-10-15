import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({query:vi.fn(),transaction:vi.fn(),neon:vi.fn(),awaitQuery:vi.fn()}));
vi.mock('@neondatabase/serverless',()=>({neon:mock.neon,Pool:vi.fn(),neonConfig:{}}));
import {qSchema} from '@/lib/server/db';
import {OPS_SCHEMA} from '@/lib/server/ops';
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('DATABASE_URL','postgresql://test@localhost/test');
 mock.neon.mockReturnValue({query:mock.query,transaction:mock.transaction});
 mock.query.mockImplementation((text:string)=>({text,then:mock.awaitQuery}));
 mock.transaction.mockResolvedValue([]);
});
afterEach(()=>vi.unstubAllEnvs());
it('submits all operations DDL in one atomic HTTP batch, never awaiting each query',async()=>{
 await qSchema(OPS_SCHEMA);
 expect(mock.transaction).toHaveBeenCalledOnce();
 const queries=mock.transaction.mock.calls[0][0];
  expect(queries).toHaveLength(83);
  expect(queries.some((q:{text:string})=>q.text.includes('ADD COLUMN IF NOT EXISTS partner_details JSONB'))).toBe(true);
  expect(queries.some((q:{text:string})=>q.text.includes("kind IN ('ticketed','school','past','partner')"))).toBe(true);
 expect(queries[0].text).toBe("SELECT pg_advisory_xact_lock(hashtext('ugt:schema-bootstrap'))");
 expect(queries[1].text).toMatch(/^CREATE TABLE IF NOT EXISTS ops_events/);
 expect(mock.awaitQuery).not.toHaveBeenCalled();
});
it('retains statement order and strips comment semicolons before batching',async()=>{
 await qSchema('CREATE TABLE x(id INT); -- explain; not another statement\nALTER TABLE x ADD COLUMN name TEXT;');
 expect(mock.transaction.mock.calls[0][0].map((q:{text:string})=>q.text).slice(1)).toEqual(['CREATE TABLE x(id INT)','ALTER TABLE x ADD COLUMN name TEXT']);
});
it('performs no HTTP request for an empty schema block',async()=>{
 await qSchema('-- comment; only');expect(mock.query).not.toHaveBeenCalled();expect(mock.transaction).not.toHaveBeenCalled();
});
it('rejects missing configuration before constructing a client',async()=>{
 vi.stubEnv('DATABASE_URL','');await expect(qSchema('SELECT 1')).rejects.toThrow('db_not_configured');expect(mock.neon).not.toHaveBeenCalled();
});
it('propagates an atomic transaction failure while logging no SQL or driver secrets',async()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>{}),error=Object.assign(new Error('password=private'),{code:'40P01'});
 try{mock.transaction.mockRejectedValue(error);await expect(qSchema('CREATE TABLE x(id INT)')).rejects.toBe(error);expect(log).toHaveBeenCalledWith('schema_bootstrap_failed',{code:'40P01'});expect(mock.transaction).toHaveBeenCalledOnce()}finally{log.mockRestore()}
});
