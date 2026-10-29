import {describe,expect,it} from 'vitest';

describe('public booking entry links',()=>{
 it.each([
  ['school','School Booking'],['campus','Campus Rave'],['public','Mega Event'],
  ['hosts','Media'],['commercial','Media'],['sponsorship','Sponsorship'],
  ['partnership','Partnership'],['unknown',undefined],['',undefined],
 ])('maps %s to the intended existing enquiry type',async(intent,expected)=>{
  const path='../lib/booking-intent.ts';
  const loaded=await import(path).catch(()=>null);
  expect(loaded?.bookingTypeForIntent,'booking links must initialize their intended form').toBeTypeOf('function');
  expect(loaded.bookingTypeForIntent(intent)).toBe(expected);
 });
});
