export type Chronology='newest'|'oldest'|'title';
/** Undated records stay last in either direction; ties have stable IDs. */
export function chronological<T>(rows:T[],sort:Chronology,date:(row:T)=>unknown,title:(row:T)=>string,id:(row:T)=>string):T[]{
 const stamp=(value:unknown)=>typeof value==='string'&&value.trim()&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
 return [...rows].sort((a,b)=>{if(sort==='title')return title(a).localeCompare(title(b),'en-KE')||id(a).localeCompare(id(b));
  const left=stamp(date(a)),right=stamp(date(b));if(left===null&&right!==null)return 1;if(right===null&&left!==null)return -1;
  return (left===null||right===null?0:sort==='oldest'?left-right:right-left)||id(a).localeCompare(id(b));
 });
}
