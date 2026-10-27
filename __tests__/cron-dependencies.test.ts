import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const db=vi.hoisted(()=>({hasDb:vi.fn(),q:vi.fn(),qSchema:vi.fn()}));
const provider=vi.hoisted(()=>({mpesa:vi.fn(),paystack:vi.fn()}));
vi.mock('@/lib/server/db',()=>({...db,db:vi.fn()}));
vi.mock('@/lib/server/mpesa-attempts',()=>({ensureMpesaAttemptSchema:vi.fn(async()=>{})}));
vi.mock('@/lib/server/mpesa',()=>({stkPushQuery:provider.mpesa}));
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>true,paystackVerify:provider.paystack}));

const request=(authenticated=true)=>new Request('https://urbangangtour.co.ke/api/internal/cron/fixture',{
  method:'POST',headers:authenticated?{'x-ugt-cron':'fictional-local-cron-key'}:{},
});

beforeEach(()=>{
  vi.resetModules();vi.resetAllMocks();
  db.hasDb.mockReturnValue(true);db.q.mockResolvedValue([]);db.qSchema.mockResolvedValue(undefined);
  provider.mpesa.mockRejectedValue(Error('fictional provider disabled'));
  provider.paystack.mockRejectedValue(Error('fictional provider disabled'));
  vi.stubEnv('UGT_CRON_SECRET','fictional-local-cron-key');
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('network forbidden')));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});

describe.each(['payment-reconcile','ticket-sweeper'] as const)('%s dependencies',job=>{
  async function load(){
    if(job==='payment-reconcile')return {
      helper:(await import('@/lib/server/reconcile')).reconcileStuckOrders,
      route:(await import('@/app/api/internal/cron/payment-reconcile/route')).POST,
      empty:{checked:0,paid:[],failed:[],stillPending:[],skipped:[]},
    };
    return {
      helper:(await import('@/lib/server/ticket-inventory')).expireStaleReservations,
      route:(await import('@/app/api/internal/cron/ticket-sweeper/route')).POST,
      empty:0,
    };
  }
  it('rejects an absent database instead of reporting an empty helper result',async()=>{
    db.hasDb.mockReturnValue(false);const {helper}=await load();
    await expect(helper()).rejects.toThrow('db_not_configured');
    expect(db.q).not.toHaveBeenCalled();expect(provider.mpesa).not.toHaveBeenCalled();expect(provider.paystack).not.toHaveBeenCalled();
  });
  it('classifies a rejected actual work query without contacting providers',async()=>{
    db.q.mockRejectedValue(Error('private database detail'));const {helper}=await load();
    await expect(helper()).rejects.toThrow('database_unavailable');
    expect(provider.mpesa).not.toHaveBeenCalled();expect(provider.paystack).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['missing','query'] as const)('returns a sanitized no-store 503 for %s database',async failure=>{
    if(failure==='missing')db.hasDb.mockReturnValue(false);else db.q.mockRejectedValue(Error('private database detail'));
    const {route}=await load(),response=await route(request());
    expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'database_unavailable'});
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(provider.mpesa).not.toHaveBeenCalled();expect(provider.paystack).not.toHaveBeenCalled();
  });
  it('preserves a genuinely empty successful helper and route result',async()=>{
    const {helper,route,empty}=await load();expect(await helper()).toEqual(empty);
    const response=await route(request());expect(response.status).toBe(200);
    expect(await response.json()).toEqual(job==='payment-reconcile'?{ok:true,...empty as object}:{ok:true,expired:0});
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('keeps authorization status codes and disables caching before work',async()=>{
    const {route}=await load();let response=await route(request(false));
    expect(response.status).toBe(401);expect(response.headers.get('Cache-Control')).toContain('no-store');
    vi.stubEnv('UGT_CRON_SECRET','');response=await route(request());
    expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'automation_not_configured'});
    expect(response.headers.get('Cache-Control')).toContain('no-store');expect(db.q).not.toHaveBeenCalled();
  });
  if(job==='ticket-sweeper')it('sanitizes unexpected schema failures as job_failed',async()=>{
    db.qSchema.mockRejectedValue(Error('private schema detail'));const {route}=await load(),response=await route(request());
    expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'job_failed'});
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
