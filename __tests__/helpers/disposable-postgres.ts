// Test-only transport. Real Postgres sessions through docker exec, network=none.
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const env={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const prefix=['--host=unix:///var/run/docker.sock'];
const docker=(args:string[])=>execFileSync('docker',[...prefix,...args],{env,encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}).trim();
function csv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const char=text[i];if(char==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(char===','&&!quoted){row.push(field);field=''}else if(char==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=char;
 }
 if(field||row.length){row.push(field);rows.push(row)}return rows;
}
const literal=(value:unknown):string=>value==null?'NULL':Array.isArray(value)?(value.length?'ARRAY['+value.map(literal).join(',')+']':'ARRAY[]::text[]'):typeof value==='number'||typeof value==='boolean'?String(value):"'"+String(value).replaceAll("'","''")+"'";
export class DisposablePostgres{
 readonly name='ugt-operations-fixture-'+randomUUID();private created=false;
 start(){docker(['info','--format','{{.ServerVersion}}']);docker(['run','--rm','-d','--network','none','--name',this.name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine']);this.created=true;if(docker(['inspect',this.name,'--format','{{.HostConfig.NetworkMode}}'])!=='none')throw Error('fixture_not_isolated')}
 ready(){return docker(['exec',this.name,'pg_isready','-h','127.0.0.1','-U','postgres']).includes('accepting connections')}
 stop(){if(this.created){docker(['stop',this.name]);this.created=false}}
 connect(){
  const child=spawn('docker',[...prefix,'exec','-i',this.name,'psql','-X','-q','--csv','-U','postgres','-v','ON_ERROR_STOP=1'],{env,stdio:['pipe','pipe','pipe']});
  let output='',errors='',ended=false,chain=Promise.resolve(),serial=0;
  let pending:{marker:string;resolve:(value:{rows:Record<string,any>[]})=>void;reject:(error:Error)=>void}|undefined;
  const exit=new Promise<void>(resolve=>child.on('exit',()=>{ended=true;pending?.reject(Error(errors||'fixture_session_closed'));pending=undefined;resolve()}));
  child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-4000)});
  child.on('error',error=>pending?.reject(error));
  child.stdout.on('data',chunk=>{
   output+=chunk.toString();if(!pending)return;
   const at=output.indexOf(pending.marker+'\n');if(at<0)return;
   const raw=output.slice(0,at).trim(),records=raw?csv(raw):[],headers=records.shift()||[];
   const rows=records.filter(row=>row.length===headers.length).map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]==='__NULL__'?null:key==='attempt'?JSON.parse(row[i]):row[i]])));
   const completed=pending;pending=undefined;output=output.slice(at+pendingMarkerLength(completed.marker));completed.resolve({rows});
  });
  function pendingMarkerLength(marker:string){return marker.length+1}
  const query=(statement:string,params:unknown[]=[])=>{
   const operation=chain.then(()=>new Promise<{rows:Record<string,any>[]}>( (resolve,reject)=>{
    if(ended){reject(Error(errors||'fixture_session_closed'));return}
    const id=++serial,marker='__ugt_end_'+id+'_'+randomUUID().replaceAll('-','');pending={marker,resolve,reject};
    const text=params.length?`PREPARE fixture_${id} AS ${statement}; EXECUTE fixture_${id}(${params.map(literal).join(',')}); DEALLOCATE fixture_${id};`:statement+';';
    child.stdin.write("\\pset null '__NULL__'\n"+text+'\n\\echo '+marker+'\n');
   }));chain=operation.then(()=>{},()=>{});return operation;
  };
  return {query,release:()=>{},end:async()=>{child.stdin.end();await exit}};
 }
 async query(statement:string,params:unknown[]=[]){const client=this.connect();try{return(await client.query(statement,params)).rows}finally{await client.end()}}
 async schema(statement:string){const client=this.connect();try{await client.query('BEGIN');await client.query(statement);await client.query('COMMIT')}finally{await client.end()}}
 pool(){const client=this.connect();return {connect:async()=>client,end:()=>client.end()}}
}
