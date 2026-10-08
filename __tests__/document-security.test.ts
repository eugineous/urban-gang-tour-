import {afterEach,describe,it,expect,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {mintCode,codeAuthentic,verifyTicketBlob} from '@/lib/server/tickets';
import {signOrganizerToken,verifyOrganizerToken} from '@/lib/server/organizer-session';
import {parseTicketDesign} from '@/lib/tickets/design-validation';
import {compactDocumentPdf,type PrintRecord} from '@/lib/tickets/compact-document-pdf';
afterEach(()=>vi.unstubAllEnvs());
describe('document credentials and print design',()=>{
 it('keeps legacy tickets valid while issuing stronger new credentials',()=>{vi.stubEnv('SESSION_SECRET','test-only-signing-key');const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',rand='ABCDEFGHJK';const h=createHmac('sha256','test-only-signing-key').update('tkt:'+rand).digest();const tag=Array.from(h.subarray(0,4),b=>alphabet[b%32]).join('');expect(codeAuthentic(`TKT-${rand}-${tag}`)).toBe(true);const fresh=mintCode();expect(fresh).toHaveLength(39);expect(codeAuthentic(fresh)).toBe(true);expect(codeAuthentic(fresh.slice(0,-1)+(fresh.endsWith('A')?'B':'A'))).toBe(false)});
 it('fails closed when production signing is unconfigured',()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('SESSION_SECRET','');expect(()=>mintCode()).toThrow();expect(verifyTicketBlob('some.signature')).toBeNull();expect(verifyOrganizerToken('some.signature')).toBeNull()});
 it('retains organizer password version and rejects extra signature segments',()=>{vi.stubEnv('SESSION_SECRET','test-only-key');const t=signOrganizerToken({id:'one',email:'sample@example.com',businessName:'Sample',pwdv:2});expect(verifyOrganizerToken(t)?.pwdv).toBe(2);expect(verifyOrganizerToken(t+'.extra')).toBeNull()});
 it('rejects field tampering and active markup in organizer branding',()=>{const b={design:'summer',name:'Sample organizer',accent:'#112233'};expect(parseTicketDesign(b)).toEqual(b);expect(parseTicketDesign({...b,status:'paid'})).toBeNull();expect(parseTicketDesign({...b,logo:'data:image/svg+xml,<script/>'})).toBeNull();expect(parseTicketDesign({...b,accent:'url(evil)'})).toBeNull()});
 it('renders a compact vector ticket without inventing a price',async()=>{const r:PrintRecord={type:'ticket',event:'Sample long event title',name:'Amani Example',date:'12 November 2026',time:'4 PM',venue:'Example',amount:-1,order:'ORD-EXAMPLE',id:'SAMPLE',tier:'Regular',qty:1,status:'Sample',verifyUrl:'https://urbangangtour.co.ke/verify/ticket/SAMPLE',reference:'Sample',items:[]};const p=await compactDocumentPdf(r);expect(p.getNumberOfPages()).toBe(1);expect(p.internal.pageSize.getWidth()).toBeCloseTo(139.7);expect(p.internal.pageSize.getHeight()).toBeCloseTo(50.8);expect(p.output('arraybuffer').byteLength).toBeLessThan(150000)});
});
