import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
for(const width of [390,1440]){
 const p=await b.newPage({viewport:{width,height:844}});let verified=false,organizerApproved=false;
 await p.route('**/api/auth',r=>r.fulfill({json:{user:null}}));
 for(const endpoint of ['/api/auth/google','/api/organizer/google'])await p.route('**'+endpoint,r=>{if(r.request().method()==='GET')return r.fulfill({json:{clientId:'test-client'}});assert.equal(JSON.parse(r.request().postData()).credential,'fictional-token');verified=true;return r.fulfill({status:endpoint.includes('organizer')&&!organizerApproved?403:200,json:endpoint.includes('organizer')?organizerApproved?{ok:true}:{error:'application_pending'}:{ok:true,user:{id:'review',name:'Preview Buyer',email:'review@example.invalid'}}})});
 await p.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:`window.google={accounts:{id:{initialize(o){this.options=o},renderButton(el){let b=document.createElement('button');b.textContent='Sign in with Google';b.onclick=()=>this.options.callback({credential:'fictional-token'});el.append(b)}}}}` }));
 await p.goto('http://127.0.0.1:4184/account');await p.getByRole('button',{name:'Sign in with Google',exact:true}).click();await p.getByRole('heading',{name:'KARIBU, PREVIEW BUYER',exact:true}).waitFor();assert.equal(verified,true);
 verified=false;await p.goto('http://127.0.0.1:4184/organizer/login');await p.getByRole('button',{name:'Sign in with Google',exact:true}).click();await p.getByText('Your organizer application is still under review.',{exact:true}).waitFor();assert.equal(verified,true);assert.ok(p.url().endsWith('/organizer/login'));
 console.log(`PASS ${width}: Google callback posts ID token, buyer session UI, pending organizer stays outside dashboard`);await p.close();
}await b.close();
