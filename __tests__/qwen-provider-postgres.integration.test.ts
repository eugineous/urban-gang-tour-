import {beforeAll,beforeEach,afterAll,afterEach,it,expect,vi} from 'vitest';
import {createCipheriv,createHash,randomBytes} from 'node:crypto';
import {DisposablePostgres} from './helpers/disposable-postgres';
const state=vi.hoisted(()=>({query:vi.fn(),schema:vi.fn(),pool:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.query,qSchema:state.schema,db:state.pool}));
const enabled=process.env.UGT_QWEN_PG_FIXTURE==='1',test=it.skipIf(!enabled),fixture=new DisposablePostgres();
const session='fixture-only-qwen-migration-session-secret';
const config={discoveryEnabled:false,draftingEnabled:true,provider:'openai',model:'gpt-4.1-mini',dailyDraftLimit:2,dailyDiscoveryLimit:96,termsConfirmed:true};
const legacyKey='legacy-fixture-gemini-key';
function legacyCiphertext(){const key=createHash('sha256').update('ugt:urban-news:provider-keys:v1\0'+session).digest(),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('ugt:urban-news:gemini:v1'));const bytes=Buffer.concat([cipher.update(legacyKey,'utf8'),cipher.final()]);return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),bytes.toString('base64url')].join('.')}
const originalCiphertext=legacyCiphertext();let api:typeof import('@/lib/server/urban-news-secrets');
beforeAll(async()=>{if(!enabled)return;if(process.env.UGT_EDITORIAL_SQL_CONTAINER||process.env.UGT_NATIVE_POSTGRES_ROOT)throw Error('fresh_network_none_fixture_required');fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 await fixture.schema("CREATE TABLE urban_news_provider_keys(provider TEXT PRIMARY KEY CHECK(provider IN ('gemini','openai')),ciphertext TEXT NOT NULL,updated_by TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE urban_news_provider_config(id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),value JSONB NOT NULL,updated_by TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());");
 await fixture.query('INSERT INTO urban_news_provider_keys(provider,ciphertext,updated_by) VALUES($1,$2,$3)',['gemini',originalCiphertext,'legacy-owner']);
 await fixture.query('INSERT INTO urban_news_provider_config(id,value,updated_by) VALUES(true,$1::jsonb,$2)',[JSON.stringify(config),'legacy-owner']);
 state.schema.mockImplementation((sql:string|readonly string[])=>fixture.schema(typeof sql==='string'?sql:sql.join(';\n')));state.query.mockImplementation(async(sql:string,args:unknown[])=>{const rows=await fixture.query(sql,args);return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='string'&&(value.startsWith('{')||value.startsWith('['))?JSON.parse(value):value])))});state.pool.mockImplementation(()=>fixture.pool());api=await import('@/lib/server/urban-news-secrets');
},30000);
beforeEach(async()=>{if(!enabled)return;vi.stubEnv('SESSION_SECRET',session);vi.stubEnv('QWEN_API_KEY','');vi.stubEnv('OPENAI_API_KEY','');vi.stubEnv('GEMINI_API_KEY','');await fixture.query("DELETE FROM urban_news_provider_keys WHERE provider='qwen'");await fixture.query('UPDATE urban_news_provider_config SET value=$1::jsonb',[JSON.stringify(config)])});
afterEach(()=>vi.unstubAllEnvs());afterAll(()=>{if(enabled)fixture.stop()},15000);
test('upgrades the legacy two-provider constraint without changing existing credentials or configuration',async()=>{
 expect(await api.getUrbanNewsConfig()).toMatchObject(config);expect(await api.getUrbanNewsProviderKey('gemini')).toBe(legacyKey);expect((await fixture.query("SELECT ciphertext FROM urban_news_provider_keys WHERE provider='gemini'"))[0].ciphertext).toBe(originalCiphertext);
 await expect(api.saveUrbanNewsProviderKey('qwen','fixture-qwen-private-key-123456','owner')).resolves.toMatchObject({config:{draftingEnabled:false},revision:2});expect(await api.getUrbanNewsProviderKey('qwen')).toBe('fixture-qwen-private-key-123456');expect((await api.getUrbanNewsConfig()).draftingEnabled).toBe(false);expect((await fixture.query("SELECT ciphertext FROM urban_news_provider_keys WHERE provider='gemini'"))[0].ciphertext).toBe(originalCiphertext);
});
test('stores Qwen ciphertext with provider authentication and exposes readiness only',async()=>{
 await api.saveUrbanNewsProviderKey('qwen','fixture-qwen-credential-123456','owner');const rows=await fixture.query("SELECT ciphertext FROM urban_news_provider_keys WHERE provider='qwen'");expect(rows[0].ciphertext).toMatch(/^v1\./);expect(JSON.stringify(rows)).not.toContain('fixture-qwen-credential');const status=await api.getUrbanNewsProviderStatus();expect(status.providers.qwen).toEqual({configured:true,keySource:'managed'});expect(JSON.stringify(status)).not.toContain('credential');await fixture.query("UPDATE urban_news_provider_keys SET ciphertext=$1 WHERE provider='qwen'",[originalCiphertext]);await expect(api.getUrbanNewsProviderKey('qwen')).rejects.toThrow('news_key_unavailable');
});
test('keeps schema replay idempotent and Qwen selection bounded and deliberate',async()=>{
 await api.getUrbanNewsConfig();const schema=state.schema.mock.calls[0][0] as string|readonly string[];await fixture.schema(typeof schema==='string'?schema:schema.join(';\n'));expect(await api.getUrbanNewsProviderKey('gemini')).toBe(legacyKey);await expect(api.saveUrbanNewsConfig({...config,provider:'qwen',model:'qwen3.8-flash',draftingEnabled:false},'owner',(await api.getUrbanNewsConfigState()).revision)).resolves.toMatchObject({config:{provider:'qwen',draftingEnabled:false}});await expect(api.saveUrbanNewsConfig({...config,provider:'qwen',model:'https://untrusted.example/model'},'owner',0)).rejects.toThrow('invalid_news_model');
});
