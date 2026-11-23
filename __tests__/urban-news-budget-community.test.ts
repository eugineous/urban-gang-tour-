import {describe,it,expect} from 'vitest';
import {budgetAllows,reserveNewsDraftCents,validNewsBudget,DEFAULT_NEWS_BUDGET} from '@/lib/server/urban-news-budget';
import {suggestUrbanNewsReplies} from '@/lib/shared/urban-news-community';
describe('Urban News spending and audience reply controls',()=>{
 it('reserves low-cost Qwen Flash below other optional providers',()=>{
  expect(reserveNewsDraftCents('qwen','qwen-flash')).toBe(2);
  expect(reserveNewsDraftCents('qwen','qwen3.8-flash')).toBe(25);
  expect(reserveNewsDraftCents('openai','gpt-4.1-mini')).toBe(50);
 });
 it('does not authorize an over-budget or invalid request',()=>{
  expect(budgetAllows(498,2,500)).toBe(true);
  expect(budgetAllows(499,2,500)).toBe(false);
  expect(budgetAllows(NaN,2,500)).toBe(false);
  expect(budgetAllows(0,2,501)).toBe(false);
 });
 it('rejects malformed provider switches and out-of-policy amounts',()=>{
  expect(validNewsBudget({monthlyLimitCents:500,enabledProviders:DEFAULT_NEWS_BUDGET.enabledProviders})).toBe(true);
  expect(validNewsBudget({monthlyLimitCents:600,enabledProviders:DEFAULT_NEWS_BUDGET.enabledProviders})).toBe(false);
  expect(validNewsBudget({monthlyLimitCents:500,enabledProviders:{qwen:true}})).toBe(false);
 });
 it('spends zero model tokens and never sends replies',()=>{
  expect(suggestUrbanNewsReplies('Excellent coverage').classification).toBe('routine');
  expect(suggestUrbanNewsReplies('Where is your source?').humanReviewRequired).toBe(true);
  expect(suggestUrbanNewsReplies('That claim is wrong').classification).toBe('correction');
  expect(suggestUrbanNewsReplies('I will attack him').suggestions).toEqual([]);
 });
});
