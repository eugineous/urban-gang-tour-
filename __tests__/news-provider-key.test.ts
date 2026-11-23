import {expect,it} from 'vitest';
import {detectNewsProvider,validNewsProviderKey} from '@/lib/shared/news-provider-key';

it('recognizes distinct provider prefixes while leaving generic sk- keys ambiguous',()=>{
 expect(detectNewsProvider('AIza'+'G'.repeat(35))).toBe('gemini');
 for(const key of ['sk-proj-fixture','sk-svcacct-fixture'])expect(detectNewsProvider(key)).toBe('openai');
 expect(detectNewsProvider('nvapi-fixture')).toBe('nvidia');
 expect(detectNewsProvider('sk-fixture-ambiguous-key')).toBeNull();
 expect(validNewsProviderKey('qwen','sk-fixture-ambiguous-key')).toBe(true);
 expect(validNewsProviderKey('gemini','sk-fixture-ambiguous-key')).toBe(false);
});
it('rejects crossed providers, masked pastes, unsupported keys and incomplete Google keys',()=>{
 for(const key of ['nvapi-fixture-private-12345','sk-proj-fixture-private-12345','sk-or-v1-fixture-private-12345','sk-ant-fixture-private-12345','fixture-xxxxxxxx-secret','fixture-••••-secret-1234','fixture-****-secret-1234','fixture-...-secret-1234','fixture-…-secret-1234','fixture\nsecret-12345678','x'.repeat(4097)]){
  expect(validNewsProviderKey('qwen',key)).toBe(false);
 }
 expect(validNewsProviderKey('gemini','AIza'+'G'.repeat(19))).toBe(false);
});
