import {describe,it,expect} from 'vitest';
import {authoritativeGoogleIdentity} from '../google-identity';
const now=1800000000000;
const valid={aud:'client',iss:'https://accounts.google.com',exp:now/1000+60,email_verified:true,sub:'subject',email:'buyer@gmail.com'};
describe('Google account linking boundaries',()=>{
 it('accepts Google-controlled verified addresses',()=>{expect(authoritativeGoogleIdentity(valid,'client',now)).toBe('buyer@gmail.com');expect(authoritativeGoogleIdentity({...valid,email:'buyer@school.edu',hd:'school.edu'},'client',now)).toBe('buyer@school.edu')});
 it('rejects expired, unverified, wrong audience and issuer identities',()=>{for(const patch of [{exp:now/1000},{email_verified:false},{aud:'attacker'},{iss:'https://attacker.test'},{sub:''}])expect(authoritativeGoogleIdentity({...valid,...patch},'client',now)).toBeNull()});
 it('never links third-party email accounts without Google domain authority',()=>{expect(authoritativeGoogleIdentity({...valid,email:'buyer@example.com'},'client',now)).toBeNull();expect(authoritativeGoogleIdentity({...valid,email:'buyer@example.com',hd:'other.test'},'client',now)).toBeNull()});
});
