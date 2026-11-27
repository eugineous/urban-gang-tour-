import {expect,it} from 'vitest';
import {rankTrending} from '@/lib/shared/news-ranking';

const now = Date.parse('2026-11-27T10:00:00Z');
const hour = 3600_000;
function item(id:string,age:number,sourceCount:number){
  return {href:'/blog/'+id,headline:id,datePublished:new Date(now-age*hour).toISOString(),section:'Music',sourceCount};
}
it('ranks recent corroboration above a slightly newer single-source story',()=>{
  const first=item('Single source',2,1);
  const checked={...item('Corroborated',5,3),newsVerification:'confirmed'};
  expect(rankTrending([first,checked],now).map(row=>row.headline)).toEqual(['Corroborated','Single source']);
});
it('excludes future, expired, unverified and duplicate coverage',()=>{
  const eligible=item('Same story',1,1);
  const rows=[
    item('No source',0,0),item('Future',-1,4),item('Old',73,4),
    {...item('Old source, new brief',1,4),sourceDate:new Date(now-96*hour).toISOString()},
    {...item('Still developing',1,5),newsVerification:'developing'},
    eligible,{...eligible,href:'/duplicate'},
  ];
  expect(rankTrending(rows,now)).toHaveLength(1);
});
