import {afterEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>false,q:()=>{throw Error('unexpected_database_access')},qSchema:()=>{throw Error('unexpected_schema_access')},db:()=>null}));
afterEach(()=>vi.unstubAllEnvs());
it('reports honest missing storage while redacting environment keys and leaving automation off',async()=>{
 vi.stubEnv('GEMINI_API_KEY','fixture-environment-secret');vi.stubEnv('OPENAI_API_KEY','');const api=await import('@/lib/server/urban-news-secrets');const status=await api.getUrbanNewsProviderStatus();expect(status).toMatchObject({storageAvailable:false,discoveryAvailable:false,providers:{gemini:{configured:true,keySource:'environment'},openai:{configured:false,keySource:'none'}}});expect(JSON.stringify(status)).not.toContain('fixture-environment-secret');expect(await api.getUrbanNewsConfig()).toMatchObject({discoveryEnabled:false,draftingEnabled:false,termsConfirmed:false,dailyDraftLimit:2});expect(await api.getUrbanNewsProviderKey('gemini')).toBe('fixture-environment-secret');await expect(api.saveUrbanNewsConfig({...await api.getUrbanNewsConfig(),draftingEnabled:true},'owner')).rejects.toThrow('news_terms_required');
});
