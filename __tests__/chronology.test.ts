import {it,expect} from 'vitest';
import {chronological} from '@/lib/chronology';
it('keeps missing dates last, ties stable, and original data untouched',()=>{
 const rows=[{id:'z',date:''},{id:'b',date:'2026-01-02'},{id:'a',date:'2026-01-02'},{id:'c',date:'2026-01-01'}];
 const sort=(kind:'newest'|'oldest')=>chronological(rows,kind,r=>r.date,r=>r.id,r=>r.id).map(r=>r.id);
 expect(sort('newest')).toEqual(['a','b','c','z']);expect(sort('oldest')).toEqual(['c','a','b','z']);expect(rows[0].id).toBe('z');
});
