import {expect,it} from 'vitest';
import {effectFeedback,emailRetryFeedback} from '@/lib/client/payment-effect-feedback';
it('separates durable work from financial confirmation',()=>{
 expect(effectFeedback('queued')).toEqual({label:'Queued for preparation',review:false});
 expect(effectFeedback('processing').label).toBe('Preparing');
 expect(effectFeedback('complete').label).toBe('Preparation complete');
 expect(effectFeedback('blocked')).toEqual({label:'Needs operator review',review:true});
 expect(effectFeedback('PRIVATE')).toEqual({label:'Status unavailable',review:true});
});
it('keeps retry outcomes distinct from both payment success and inbox delivery',()=>{
 expect(emailRetryFeedback('accepted')).toContain('email service');
 expect(emailRetryFeedback('accepted')).toContain('not confirm inbox delivery');
 expect(emailRetryFeedback('queued')).toContain('queued');
 expect(emailRetryFeedback('failed')).toContain('operator review');
 expect(emailRetryFeedback('manual_review_required')).toContain('operator review');
 expect(emailRetryFeedback('PRIVATE')).toContain('could not be confirmed');
});
