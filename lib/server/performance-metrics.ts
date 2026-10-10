export const METRIC_LIMITS = { CLS: 10, INP: 120000, LCP: 120000, FCP: 120000, TTFB: 120000 } as const;
export function validPerformanceSample(input: unknown): input is {name:keyof typeof METRIC_LIMITS;value:number;path:string} {
  if(!input||typeof input!=='object'||Array.isArray(input))return false;
  const v=input as Record<string,unknown>;
  return Object.keys(v).every(k=>['name','value','path'].includes(k)) && typeof v.name==='string' && v.name in METRIC_LIMITS && typeof v.value==='number' && Number.isFinite(v.value) && v.value>=0 && v.value<=METRIC_LIMITS[v.name as keyof typeof METRIC_LIMITS] && typeof v.path==='string' && v.path.length<=250 && /^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(v.path) && !/^\/(api|admin|account|organizer|cart|checkout|pay|receipt|tickets|t|verify|orders|book\/status)(\/|$)/.test(v.path);
}
