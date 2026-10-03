import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const H='https://ndfbgoyvcwjayujkndun.hasura.us-east-1.nhost.run', A='https://ndfbgoyvcwjayujkndun.auth.us-east-1.nhost.run/v1';
const tables=['agencies','agents','leads','lead_events','appointments','candidates','candidate_events','campaigns','campaign_events','content_assets','content_reviews','ai_interactions','consents','audit_logs','settings'];
const businessTables=tables.filter(t=>!['agencies','agents'].includes(t));
function env(p){const o={};for(const l of readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(!m)continue;let v=m[2];if(v.length>1&&((v[0]==='"'&&v.at(-1)==='"')||(v[0]==="'"&&v.at(-1)==="'")))v=v.slice(1,-1);o[m[1]]=v}return o}
async function req(u,i){const r=await fetch(u,i),t=await r.text();let b;try{b=t?JSON.parse(t):null}catch{}if(!r.ok){const e=new Error(b?.error??b?.code??`HTTP ${r.status}`);e.status=r.status;throw e}return {b,t}}
const p=env('.env'),e=env('.env.test.local');if(!e.TENANT_TEST_A_EMAIL||!e.TENANT_TEST_A_PASSWORD||!e.TENANT_TEST_B_EMAIL||!e.TENANT_TEST_B_PASSWORD)throw Error('env incomplete');
if(!execFileSync('git',['check-ignore','.env.test.local'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()||execFileSync('git',['ls-files','.env.test.local'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())throw Error('env unsafe');
let secret;for(const k of ['HASURA_ADMIN_SECRET','HASURA_GRAPHQL_ADMIN_SECRET','NHOST_ADMIN_SECRET']){if(!p[k])continue;try{await req(H+'/v1/metadata',{method:'POST',headers:{'content-type':'application/json','x-hasura-admin-secret':p[k]},body:'{"type":"get_inconsistent_metadata","args":{}}'});secret=p[k];break}catch{}}if(!secret)throw Error('admin unavailable');
const ah={'content-type':'application/json','x-hasura-admin-secret':secret};
const sql=async(s,ro=true)=>(await req(H+'/v2/query',{method:'POST',headers:ah,body:JSON.stringify({type:'run_sql',args:{source:'default',sql:s,read_only:ro,cascade:false}})})).b;
const login=async(email,password)=>{const x=(await req(A+'/signin/email-password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})).b.session;if(!x?.accessToken)throw Error('login session absent');const c=JSON.parse(Buffer.from(x.accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64'));const h=c['https://hasura.io/jwt/claims']??{};if(h['x-hasura-user-id']!==x.user.id||h['x-hasura-default-role']!=='user')throw Error('JWT binding failed');return x};
const sa=await login(e.TENANT_TEST_A_EMAIL,e.TENANT_TEST_A_PASSWORD),sb=await login(e.TENANT_TEST_B_EMAIL,e.TENANT_TEST_B_PASSWORD);if(sa.user.id===sb.user.id)throw Error('users not distinct');
const before=(await req(H+'/v1/metadata',{method:'POST',headers:ah,body:'{"type":"export_metadata","args":{}}'}));const bh=createHash('sha256').update(before.t).digest('hex').toUpperCase();
const base=(await sql(`SELECT (SELECT count(*) FROM auth.users)::text,(SELECT count(*) FROM agencies)::text,(SELECT count(*) FROM agents)::text,${businessTables.map(t=>`(SELECT count(*) FROM ${t})::text`).join(',')},(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.agents'::regclass AND contype='u' AND conname='agents_user_id_unique'))::text;`)).result[1];
if(base.join(',')!==`2,2,2,${businessTables.map(()=>0).join(',')},true`)throw Error(`pre-seed baseline changed: ${base.join(',')}`);
const id={};for(const t of tables)id[t]=[randomUUID(),randomUUID()];const q=v=>`'${String(v).replaceAll("'","''")}'`;
const agencyRows=(await sql("SELECT id::text,public_slug FROM agencies WHERE public_slug IN ('phase2b-a','phase2b-b') ORDER BY public_slug;")).result.slice(1);if(agencyRows.length!==2)throw Error('fixture agencies missing');id.agencies=[agencyRows[0][0],agencyRows[1][0]];
const agentRows=(await sql(`SELECT id::text,agency_id::text,user_id::text FROM agents WHERE agency_id IN ('${id.agencies[0]}','${id.agencies[1]}') ORDER BY agency_id;`)).result.slice(1);if(agentRows.length!==2)throw Error('fixture memberships missing');
for(const [index,userId] of [[0,sa.user.id],[1,sb.user.id]]){const row=agentRows.find(x=>x[1]===id.agencies[index]&&x[2]===userId);if(!row)throw Error('fixture membership identity mismatch');id.agents[index]=row[0]}
const seed=`BEGIN;
INSERT INTO campaigns(id,agency_id,name,platform) VALUES ('${id.campaigns[0]}','${id.agencies[0]}','Campaign A','direct'),('${id.campaigns[1]}','${id.agencies[1]}','Campaign B','direct');
INSERT INTO campaign_events(id,campaign_id,agency_id,event_type,description) VALUES ('${id.campaign_events[0]}','${id.campaigns[0]}','${id.agencies[0]}','created','Synthetic A'),('${id.campaign_events[1]}','${id.campaigns[1]}','${id.agencies[1]}','created','Synthetic B');
INSERT INTO leads(id,agency_id,first_name,last_name,email,campaign_id,assigned_agent_id,notes) VALUES ('${id.leads[0]}','${id.agencies[0]}','Lead','Alpha','lead-a@example.invalid','${id.campaigns[0]}','${id.agents[0]}','A original'),('${id.leads[1]}','${id.agencies[1]}','Lead','Beta','lead-b@example.invalid','${id.campaigns[1]}','${id.agents[1]}','B original');
INSERT INTO lead_events(id,lead_id,agency_id,event_type,description) VALUES ('${id.lead_events[0]}','${id.leads[0]}','${id.agencies[0]}','created','Synthetic A'),('${id.lead_events[1]}','${id.leads[1]}','${id.agencies[1]}','created','Synthetic B');
INSERT INTO appointments(id,agency_id,lead_id,agent_id,date,time) VALUES ('${id.appointments[0]}','${id.agencies[0]}','${id.leads[0]}','${id.agents[0]}','2099-01-01','09:00'),('${id.appointments[1]}','${id.agencies[1]}','${id.leads[1]}','${id.agents[1]}','2099-01-02','10:00');
INSERT INTO candidates(id,agency_id,first_name,last_name,email,assigned_agent_id) VALUES ('${id.candidates[0]}','${id.agencies[0]}','Candidate','Alpha','candidate-a@example.invalid','${id.agents[0]}'),('${id.candidates[1]}','${id.agencies[1]}','Candidate','Beta','candidate-b@example.invalid','${id.agents[1]}');
INSERT INTO candidate_events(id,candidate_id,agency_id,event_type,description) VALUES ('${id.candidate_events[0]}','${id.candidates[0]}','${id.agencies[0]}','created','Synthetic A'),('${id.candidate_events[1]}','${id.candidates[1]}','${id.agencies[1]}','created','Synthetic B');
INSERT INTO content_assets(id,agency_id,title,type,content,created_by) VALUES ('${id.content_assets[0]}','${id.agencies[0]}','Asset A','social_post','Synthetic A','${id.agents[0]}'),('${id.content_assets[1]}','${id.agencies[1]}','Asset B','social_post','Synthetic B','${id.agents[1]}');
INSERT INTO content_reviews(id,content_asset_id,agency_id,reviewer,action,comment) VALUES ('${id.content_reviews[0]}','${id.content_assets[0]}','${id.agencies[0]}','${id.agents[0]}','approve','Synthetic A'),('${id.content_reviews[1]}','${id.content_assets[1]}','${id.agencies[1]}','${id.agents[1]}','approve','Synthetic B');
INSERT INTO ai_interactions(id,agency_id,user_id,interaction_type,input,output) VALUES ('${id.ai_interactions[0]}','${id.agencies[0]}',${q(sa.user.id)},'security_test','A','A'),('${id.ai_interactions[1]}','${id.agencies[1]}',${q(sb.user.id)},'security_test','B','B');
INSERT INTO consents(id,agency_id,lead_id,consent_type,consent_text) VALUES ('${id.consents[0]}','${id.agencies[0]}','${id.leads[0]}','security_test','Synthetic A'),('${id.consents[1]}','${id.agencies[1]}','${id.leads[1]}','security_test','Synthetic B');
INSERT INTO audit_logs(id,agency_id,user_id,action,entity_type,entity_id) VALUES ('${id.audit_logs[0]}','${id.agencies[0]}',${q(sa.user.id)},'security_test','lead','${id.leads[0]}'),('${id.audit_logs[1]}','${id.agencies[1]}',${q(sb.user.id)},'security_test','lead','${id.leads[1]}');
INSERT INTO settings(id,agency_id,key,value) VALUES ('${id.settings[0]}','${id.agencies[0]}','phase2b_security','{"tenant":"A"}'),('${id.settings[1]}','${id.agencies[1]}','phase2b_security','{"tenant":"B"}');COMMIT;`;
await sql(seed,false);console.log('FIXTURES_CREATED=VERIFIED');
for(const t of businessTables){const rows=(await sql(`SELECT id::text,agency_id::text FROM ${t} WHERE agency_id IN ('${id.agencies[0]}','${id.agencies[1]}') ORDER BY agency_id;`)).result.slice(1);const a=rows.find(x=>x[1]===id.agencies[0]),b=rows.find(x=>x[1]===id.agencies[1]);if(!a||!b||rows.length!==2)throw Error(`fixture accounting failed ${t}`)}
const idsFor=t=>id[t].map(q).join(',');
const cleanupFixtures=()=>sql(`BEGIN;
DELETE FROM content_reviews WHERE id IN (${idsFor('content_reviews')});
DELETE FROM candidate_events WHERE id IN (${idsFor('candidate_events')});
DELETE FROM appointments WHERE id IN (${idsFor('appointments')});
DELETE FROM lead_events WHERE id IN (${idsFor('lead_events')});
DELETE FROM consents WHERE id IN (${idsFor('consents')});
DELETE FROM campaign_events WHERE id IN (${idsFor('campaign_events')});
DELETE FROM audit_logs WHERE id IN (${idsFor('audit_logs')});
DELETE FROM content_assets WHERE id IN (${idsFor('content_assets')});
DELETE FROM ai_interactions WHERE id IN (${idsFor('ai_interactions')});
DELETE FROM settings WHERE id IN (${idsFor('settings')});
DELETE FROM candidates WHERE id IN (${idsFor('candidates')});
DELETE FROM leads WHERE id IN (${idsFor('leads')});
DELETE FROM campaigns WHERE id IN (${idsFor('campaigns')});
COMMIT;`,false);
try {
const filter={agency:{agents_by_agency_id:{user_id:{_eq:'X-Hasura-User-Id'}}}},agencyFilter={agents_by_agency_id:{user_id:{_eq:'X-Hasura-User-Id'}}};
const cols={agencies:['id','name','domain','primary_color','secondary_color','contact_email','contact_phone','default_calendar_url','compliance_disclaimer','privacy_policy_url','terms_url','career_disclaimer','financial_education_disclaimer','public_slug','created_at','updated_at'],agents:['id','agency_id','first_name','last_name','email','phone','role','status','license_status','bio','created_at'],leads:['id','agency_id','first_name','last_name','email','phone','source','campaign_id','utm_source','utm_medium','utm_campaign','status','score','score_tier','interest','assigned_agent_id','consent','consent_method','preferred_contact','checkup_responses','ai_summary','notes','last_activity','created_at'],lead_events:['id','lead_id','agency_id','event_type','description','metadata','created_at'],appointments:['id','agency_id','lead_id','agent_id','date','time','meeting_type','status','notes','created_at','updated_at'],candidates:['id','agency_id','first_name','last_name','email','phone','state','current_occupation','years_experience','why_interested','sales_experience','financial_services_experience','preferred_contact','status','score','assigned_agent_id','created_at'],candidate_events:['id','candidate_id','agency_id','event_type','description','created_at'],campaigns:['id','agency_id','name','platform','campaign_type','landing_page','utm_source','utm_medium','utm_campaign','budget','status','created_at'],campaign_events:['id','campaign_id','agency_id','event_type','description','metadata','created_at'],content_assets:['id','agency_id','title','type','content','status','created_by','reviewer','approval_date','version','ai_generated','created_at','updated_at'],content_reviews:['id','content_asset_id','agency_id','reviewer','action','comment','created_at'],ai_interactions:['id','agency_id','interaction_type','input','output','created_at'],consents:['id','agency_id','lead_id','consent_type','consent_text','created_at'],audit_logs:['id','agency_id','action','entity_type','entity_id','metadata','created_at'],settings:['id','agency_id','key','value','created_at','updated_at']};
const ops=[];for(const t of tables)ops.push({type:'pg_create_select_permission',args:{source:'default',table:{schema:'public',name:t},role:'user',permission:{columns:cols[t],filter:t==='agencies'?agencyFilter:filter,allow_aggregations:false}}});for(const [t,c] of Object.entries({leads:['status','notes'],appointments:['status','notes'],candidates:['status']}))ops.push({type:'pg_create_update_permission',args:{source:'default',table:{schema:'public',name:t},role:'user',permission:{columns:c,filter,check:filter}}});
const nextMetadata=JSON.parse(before.t),source=nextMetadata.sources.find(x=>x.name==='default');if(!source)throw Error('default metadata source missing');for(const op of ops){const table=source.tables.find(x=>x.table.schema===op.args.table.schema&&x.table.name===op.args.table.name);if(!table)throw Error(`metadata table missing ${op.args.table.name}`);const key=op.type==='pg_create_select_permission'?'select_permissions':'update_permissions';table[key]=[...(table[key]??[]).filter(x=>x.role!=='user'),{role:'user',permission:op.args.permission}]}
await req(H+'/v1/metadata',{method:'POST',headers:ah,body:JSON.stringify({type:'replace_metadata',args:{allow_inconsistent_metadata:false,metadata:nextMetadata}})});console.log('PERMISSIONS_APPLIED=VERIFIED');
const consistency=(await req(H+'/v1/metadata',{method:'POST',headers:ah,body:'{"type":"get_inconsistent_metadata","args":{}}'})).b;if(!consistency.is_consistent||(consistency.inconsistent_objects??[]).length)throw Error('metadata inconsistent');
const gql=async(token,query,variables={},extra={})=>{const headers={'content-type':'application/json',...extra};if(token)headers.authorization=`Bearer ${token}`;return(await req(H+'/v1/graphql',{method:'POST',headers,body:JSON.stringify({query,variables})})).b};
const denied=async(token,query,variables={},extra={})=>{try{const r=await gql(token,query,variables,extra);return Boolean(r.errors)||Object.values(r.data??{}).every(v=>v===null||v?.affected_rows===0||Array.isArray(v)&&v.length===0)}catch{return true}};
const listQ=`query { ${tables.map(t=>t==='agencies'?`${t}{id}`:`${t}{id agency_id}`).join(' ')} }`;
for(const [session,n] of [[sa,0],[sb,1]]){const r=await gql(session.accessToken,listQ);if(r.errors)throw Error('tenant list query failed');for(const t of tables){const rows=r.data[t];if(rows.length!==1)throw Error(`tenant count failure ${t}`);if(t==='agencies'&&rows[0].id!==id.agencies[n])throw Error('agency isolation failure');if(t!=='agencies'&&rows[0].agency_id!==id.agencies[n])throw Error(`tenant isolation failure ${t}`)}}console.log('TENANT_SELECT_ISOLATION=VERIFIED');
for(const [session,other] of [[sa,1],[sb,0]])for(const t of tables){const qn=`query($id:uuid!){${t}_by_pk(id:$id){id}}`;if(!(await denied(session.accessToken,qn,{id:id[t][other]})))throw Error(`known-id visible ${t}`)}console.log('KNOWN_ID_BLOCKED=VERIFIED');
const upd=`mutation($id:uuid!,$notes:String!){update_leads(where:{id:{_eq:$id}},_set:{notes:$notes}){affected_rows returning{id notes}}}`;
let r=await gql(sa.accessToken,upd,{id:id.leads[0],notes:'A authorized'});if(r.errors||r.data.update_leads.affected_rows!==1)throw Error('own update A failed');r=await gql(sb.accessToken,upd,{id:id.leads[1],notes:'B authorized'});if(r.errors||r.data.update_leads.affected_rows!==1)throw Error('own update B failed');if(!(await denied(sa.accessToken,upd,{id:id.leads[1],notes:'attack'}))||!(await denied(sb.accessToken,upd,{id:id.leads[0],notes:'attack'})))throw Error('cross update succeeded');console.log('UPDATE_BOUNDARY=VERIFIED');
const transfer=`mutation($id:uuid!,$agency:uuid!){update_leads(where:{id:{_eq:$id}},_set:{agency_id:$agency}){affected_rows}}`;if(!(await denied(sa.accessToken,transfer,{id:id.leads[0],agency:id.agencies[1]})))throw Error('row transfer succeeded');
const insert=`mutation($agency:uuid!){insert_leads_one(object:{agency_id:$agency,first_name:"X",last_name:"X",email:"x@example.invalid"}){id}}`;if(!(await denied(sa.accessToken,insert,{agency:id.agencies[0]}))||!(await denied(sb.accessToken,insert,{agency:id.agencies[1]})))throw Error('insert succeeded');
const candidateInsert=`mutation($agency:uuid!){insert_candidates_one(object:{agency_id:$agency,first_name:"X",last_name:"X",email:"x@example.invalid"}){id}}`;if(!(await denied(sa.accessToken,candidateInsert,{agency:id.agencies[0]})))throw Error('candidate insert succeeded');
const appointmentInsert=`mutation($agency:uuid!,$lead:uuid!){insert_appointments_one(object:{agency_id:$agency,lead_id:$lead,date:"2099-01-03",time:"11:00"}){id}}`;if(!(await denied(sa.accessToken,appointmentInsert,{agency:id.agencies[0],lead:id.leads[0]})))throw Error('appointment insert succeeded');
const agentInsert=`mutation($agency:uuid!){insert_agents_one(object:{agency_id:$agency,first_name:"X",last_name:"X",email:"x@example.invalid"}){id}}`;if(!(await denied(sa.accessToken,agentInsert,{agency:id.agencies[0]})))throw Error('membership forgery');
for(const role of ['admin','agency_admin','agent'])if(!(await denied(sa.accessToken,'query{agencies{id}}',{}, {'x-hasura-role':role})))throw Error(`role spoof ${role}`);
const spoof=await gql(sa.accessToken,'query($id:uuid!){agencies_by_pk(id:$id){id}}',{id:id.agencies[1]},{'x-hasura-user-id':sb.user.id});if(!spoof.errors&&spoof.data.agencies_by_pk)throw Error('identity spoof');
const forgeries=[
  [`mutation($agency:uuid!){insert_audit_logs_one(object:{agency_id:$agency,action:"forged"}){id}}`,{agency:id.agencies[0]}],
  [`mutation($agency:uuid!,$lead:uuid!){insert_lead_events_one(object:{agency_id:$agency,lead_id:$lead,event_type:"forged"}){id}}`,{agency:id.agencies[0],lead:id.leads[0]}],
  [`mutation($agency:uuid!,$candidate:uuid!){insert_candidate_events_one(object:{agency_id:$agency,candidate_id:$candidate,event_type:"forged"}){id}}`,{agency:id.agencies[0],candidate:id.candidates[0]}],
  [`mutation($agency:uuid!){insert_ai_interactions_one(object:{agency_id:$agency,interaction_type:"forged"}){id}}`,{agency:id.agencies[0]}],
];for(const [mutation,variables] of forgeries)if(!(await denied(sa.accessToken,mutation,variables)))throw Error('audit/event forgery');
if(!(await denied(null,'query{agencies{id}}')))throw Error('public access');console.log('ADVERSARIAL_BOUNDARIES=VERIFIED');
const integrity=(await sql(`SELECT
  (SELECT notes FROM leads WHERE id='${id.leads[0]}'),
  (SELECT agency_id::text FROM leads WHERE id='${id.leads[0]}'),
  (SELECT notes FROM leads WHERE id='${id.leads[1]}'),
  (SELECT agency_id::text FROM leads WHERE id='${id.leads[1]}'),
  (SELECT count(*)::text FROM agents WHERE (user_id=${q(sa.user.id)} AND agency_id='${id.agencies[0]}') OR (user_id=${q(sb.user.id)} AND agency_id='${id.agencies[1]}')),
  (SELECT count(*)::text FROM audit_logs),
  (SELECT count(*)::text FROM lead_events),
  (SELECT count(*)::text FROM candidate_events),
  (SELECT count(*)::text FROM ai_interactions);`)).result[1];
if(integrity.join(',')!==`A authorized,${id.agencies[0]},B authorized,${id.agencies[1]},2,2,2,2,2`)throw Error('trusted post-attack integrity check failed');console.log('ADMIN_POST_ATTACK_INTEGRITY=VERIFIED');
const dup=`BEGIN;DO $x$ BEGIN BEGIN INSERT INTO agents(agency_id,user_id,first_name,last_name,email) VALUES ('${id.agencies[1]}',${q(sa.user.id)},'D','D','d@example.invalid'); EXCEPTION WHEN unique_violation THEN RETURN; END; RAISE EXCEPTION 'duplicate allowed'; END $x$;ROLLBACK;`;await sql(dup,false);console.log('DUPLICATE_MEMBERSHIP_BLOCKED=VERIFIED');
console.log('FIXTURE_PROVENANCE=2_ROWS_PER_TABLE_VERIFIED');
} finally {
await cleanupFixtures();
}
const after=await req(H+'/v1/metadata',{method:'POST',headers:ah,body:'{"type":"export_metadata","args":{}}'});const fh=createHash('sha256').update(after.t).digest('hex').toUpperCase();const counts=(await sql(`SELECT (SELECT count(*) FROM auth.users)::text,(SELECT count(*) FROM agencies)::text,(SELECT count(*) FROM agents)::text,${tables.map(t=>`(SELECT count(*) FROM ${t})::text`).join(',')};`)).result[1];
if(counts.join(',')!=='2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0')throw Error(`fixture cleanup accounting failed: ${counts.join(',')}`);
console.log('FIXTURES_CLEANED=VERIFIED');console.log('TEST_FIXTURE_STRATEGY=CREATE_TEST_CLEAN');console.log(`METADATA_HASH_BEFORE=${bh}`);console.log(`METADATA_HASH_AFTER=${fh}`);console.log('METADATA_CONSISTENCY=VERIFIED');console.log(`FINAL_COUNTS=${counts.join(',')}`);console.log('PHASE2B_RUNTIME=VERIFIED');
