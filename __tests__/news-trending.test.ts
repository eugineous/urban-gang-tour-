import {expect,it} from 'vitest';
import {rankTrending,selectNewsFront} from '@/lib/shared/news-ranking';

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
    item('No source',0,0),item('Future',-1,4),item('Old',169,4),
    {...item('Old source, new brief',1,4),sourceDate:new Date(now-180*hour).toISOString()},
    {...item('From the archive',1,4),kind:'feature'},
    {...item('Still developing',1,5),newsVerification:'developing'},
    eligible,{...eligible,href:'/duplicate'},
  ];
  expect(rankTrending(rows,now)).toHaveLength(1);
});
it('admits stories reported within the last week to trending',()=>{
  expect(rankTrending([item('Still timely',96,2)],now)).toHaveLength(1);
});
it('features up to four diverse stories and keeps a separate chronological list',()=>{
  const rows=['Music','Music','Screen','Sport','Culture','Music','Sport','Style'].map((section,index)=>({...item(`Story ${index}`,index,1),section,image:'/photo.webp'}));
  const {top,latest}=selectNewsFront(rows);
  expect(top.map(row=>row.section)).toEqual(['Music','Screen','Sport','Culture']);
  expect(latest.map(row=>row.headline)).toEqual(['Story 1','Story 5','Story 6','Story 7']);
  expect(selectNewsFront(rows.slice(0,2)).latest).toEqual(rows.slice(1,2));
  expect(selectNewsFront(rows,false)).toEqual({top:[],latest:rows});
});
