// Real, isolated local PostgreSQL only. Never accepts DATABASE_URL or a host.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),container='ugt-event-fixture-20261016';
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const docker=['--host=unix:///var/run/docker.sock'];
const {stdout}=await run('docker',[...docker,'inspect',container,'--format','{{.HostConfig.NetworkMode}}'],{env});assert.equal(stdout.trim(),'none');
const source=await readFile(new URL('../lib/server/ops.ts',import.meta.url),'utf8');
const start=source.indexOf('CREATE TABLE IF NOT EXISTS tour_events ('),end=source.indexOf('CREATE TABLE IF NOT EXISTS products (',start);
assert.ok(start>0&&end>start);const schema=source.slice(start,end),baseEnd=schema.indexOf('\n);')+4;assert.ok(baseEnd>3);
const sql=`BEGIN; SET LOCAL statement_timeout='5s';
${schema.slice(0,baseEnd)}
INSERT INTO tour_events(id,kind,name,status) VALUES ('private','school','Private fixture','draft'),('live','ticketed','Live fixture','published'),('history','past','Completed fixture','completed');
${schema.slice(baseEnd)}
INSERT INTO tour_events(id,slug,kind,name,status) VALUES ('announcement','announcement','partner','Title only fixture','announced');
${schema.slice(baseEnd)}
DO $$ BEGIN
 IF (SELECT count(*) FROM tour_events)<>4 THEN RAISE EXCEPTION 'records_changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tour_events WHERE id='private' AND status='draft') THEN RAISE EXCEPTION 'draft_changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tour_events WHERE id='announcement' AND event_date IS NULL AND venue='' AND image='' AND tiers='[]'::jsonb AND partner_details IS NULL) THEN RAISE EXCEPTION 'announcement_invented_details'; END IF;
 BEGIN INSERT INTO tour_events(id,kind,name,status) VALUES ('invalid','school','Invalid','unsafe'); RAISE EXCEPTION 'unsafe_status_accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM tour_events WHERE status='published' AND kind='ticketed')<>1 THEN RAISE EXCEPTION 'announcement_in_sale_scope'; END IF;
END $$;
SELECT 'PASS real PostgreSQL: legacy records, title-only announcement, idempotent constraint migration, invalid state rejection and sale-state isolation' AS result;
ROLLBACK;`;
const child=execFile('docker',[...docker,'exec','-i',container,'psql','-X','-U','postgres','-q','-v','ON_ERROR_STOP=1'],{env});let output='',error='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>error+=data);child.stdin.end(sql);await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))});assert.match(output,/PASS real PostgreSQL/);console.log(output.trim());
