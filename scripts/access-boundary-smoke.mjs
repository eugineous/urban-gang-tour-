import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:4184';
const paths=['/api/admin/me','/api/admin/accounts','/api/admin/data?view=orders','/api/admin/docs/list','/api/admin/gmail/messages','/api/organizer/me','/api/organizer/events','/api/organizer/events/fixture-event','/api/organizer/events/fixture-event/stats'];
for(const path of paths){const response=await fetch(base+path,{redirect:'manual'});assert.ok([401,403].includes(response.status),`${path}: ${response.status}`);console.log('PASS anonymous denied',path)}
const studio=await fetch(base+'/admin/docs/designs',{redirect:'manual'});assert.ok([302,307].includes(studio.status));assert.equal(new URL(studio.headers.get('location'),base).pathname,'/admin');assert.equal(new URL(studio.headers.get('location'),base).searchParams.get('tab'),'Documents');console.log('PASS protected document studio keeps intended workspace');
const hidden=await fetch(base+'/_design-pages/index.html');assert.equal(hidden.status,404);console.log('PASS private export path not directly exposed');
