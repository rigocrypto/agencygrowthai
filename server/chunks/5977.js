exports.id=5977,exports.ids=[5977],exports.modules={52213:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=52213,e.exports=t},94661:(e,t,n)=>{"use strict";n.d(t,{Ug:()=>a,vM:()=>i});var r=n(66886);async function i(e,t){let n,i;let a=e.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();if("application/json"!==a)return{ok:!1,response:r.Z.json({error:"Content-Type must be application/json."},{status:415})};let s=Number(e.headers.get("content-length")??"0");if(Number.isFinite(s)&&s>32768)return{ok:!1,response:r.Z.json({error:"Request body is too large."},{status:413})};try{n=await e.text()}catch{return{ok:!1,response:r.Z.json({error:"Malformed request body."},{status:400})}}if(new TextEncoder().encode(n).byteLength>32768)return{ok:!1,response:r.Z.json({error:"Request body is too large."},{status:413})};try{i=JSON.parse(n)}catch{return{ok:!1,response:r.Z.json({error:"Malformed request body."},{status:400})}}let o=t.safeParse(i);return o.success?{ok:!0,value:o.data}:{ok:!1,response:r.Z.json({error:"Request validation failed."},{status:400})}}function a(e){let t="object"==typeof e&&null!==e&&"code"in e?String(e.code):"";return"UNKNOWN_AGENCY"===t?r.Z.json({error:"Unknown agency."},{status:404}):"LEAD_NOT_FOUND"===t?r.Z.json({error:"Lead not found."},{status:404}):"IDEMPOTENCY_CONFLICT"===t?r.Z.json({error:"Idempotency key was already used for a different request."},{status:409}):"NOT_CONFIGURED"===t?r.Z.json({error:"Public intake is not configured."},{status:503}):r.Z.json({error:"Could not process the request."},{status:500})}},71968:(e,t,n)=>{"use strict";n.d(t,{NP:()=>y,sC:()=>p,yo:()=>l});var r=n(6005);class i extends Error{constructor(e){super(e),this.name="TrustedNhostError",this.code=e}}function a(e){return(0,r.createHash)("sha256").update(JSON.stringify(e)).digest("hex")}function s(e,t){if(e.idempotency_fingerprint!==t)throw new i("IDEMPOTENCY_CONFLICT");let{idempotency_fingerprint:n,...r}=e;return r}async function o(e,t){let n,r;let{endpoint:a,adminSecret:s}=function(){let e="ndfbgoyvcwjayujkndun".trim(),t="us-east-1".trim(),n=(process.env.HASURA_ADMIN_SECRET??process.env.HASURA_GRAPHQL_ADMIN_SECRET??process.env.NHOST_ADMIN_SECRET)?.trim();if(!e||!t||!n)throw new i("NOT_CONFIGURED");return{endpoint:`https://${e}.hasura.${t}.nhost.run/v1/graphql`,adminSecret:n}}();try{n=await fetch(a,{method:"POST",headers:{"content-type":"application/json","x-hasura-admin-secret":s},body:JSON.stringify({query:e,variables:t}),cache:"no-store"})}catch{throw new i("UPSTREAM_FAILURE")}try{r=await n.json()}catch{throw new i("UPSTREAM_FAILURE")}if(!n.ok||r.errors?.length||!r.data)throw new i("UPSTREAM_FAILURE");return r.data}async function c(e){let t=await o(`query ResolvePublicAgency($slug: String!) {
      agencies(where: {public_slug: {_eq: $slug}}, limit: 1) { id }
    }`,{slug:e}),n=t.agencies[0]?.id;if(!n)throw new i("UNKNOWN_AGENCY");return n}let d=`
  id agency_id first_name last_name email phone source campaign_id utm_source
  utm_medium utm_campaign status score score_tier interest assigned_agent_id
  consent consent_method preferred_contact checkup_responses ai_summary notes
  last_activity created_at
`,u=`
  id agency_id lead_id agent_id date time meeting_type status notes created_at updated_at
`,_=`
  id agency_id first_name last_name email phone state current_occupation
  years_experience why_interested sales_experience financial_services_experience
  preferred_contact status score score_breakdown assigned_agent_id created_at
`;async function p(e){let t=await c(e.agencySlug),n=`${e.firstName} ${e.lastName} completed the financial checkup. Score: ${e.score}/100. Primary goal: ${e.responses.primary_goal.replace(/_/g," ")}.`,r="I consent to be contacted about my financial checkup results.",u=a({agencyId:t,firstName:e.firstName,lastName:e.lastName,email:e.email,phone:e.phone,source:e.source,interest:e.interest,preferredContact:e.preferredContact,responses:e.responses,score:e.score,scoreTier:e.scoreTier,aiSummary:n,consentText:r}),_=await o(`query ExistingPublicLead($agencyId: uuid!, $key: uuid!) {
      leads(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${d} idempotency_fingerprint
      }
    }`,{agencyId:t,key:e.idempotencyKey});if(_.leads[0])return s(_.leads[0],u);let p=await o(`mutation TrustedPublicLead($object: leads_insert_input!) {
      insert_leads_one(
        object: $object,
        on_conflict: {constraint: leads_agency_id_idempotency_key_key, update_columns: []}
      ) { ${d} }
    }`,{object:{agency_id:t,first_name:e.firstName,last_name:e.lastName,email:e.email,phone:e.phone,source:e.source,status:"new",score:e.score,score_tier:e.scoreTier,interest:e.interest,consent:!0,consent_method:"checkup_form",preferred_contact:e.preferredContact,checkup_responses:e.responses,ai_summary:n,idempotency_key:e.idempotencyKey,idempotency_fingerprint:u,consents_by_lead_id:{data:[{agency_id:t,consent_type:"contact",consent_text:r}]}}});if(p.insert_leads_one)return p.insert_leads_one;let y=await o(`query ConcurrentPublicLead($agencyId: uuid!, $key: uuid!) {
      leads(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${d} idempotency_fingerprint
      }
    }`,{agencyId:t,key:e.idempotencyKey});if(!y.leads[0])throw new i("UPSTREAM_FAILURE");return s(y.leads[0],u)}async function y(e){let t=await c(e.agencySlug),n=a({agencyId:t,firstName:e.firstName,lastName:e.lastName,email:e.email,phone:e.phone,state:e.state,currentOccupation:e.currentOccupation,yearsExperience:e.yearsExperience,whyInterested:e.whyInterested,salesExperience:e.salesExperience,financialServicesExperience:e.financialServicesExperience,preferredContact:e.preferredContact,score:e.score,scoreBreakdown:e.scoreBreakdown}),r=await o(`query ExistingPublicCandidate($agencyId: uuid!, $key: uuid!) {
      candidates(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${_} idempotency_fingerprint
      }
    }`,{agencyId:t,key:e.idempotencyKey});if(r.candidates[0])return s(r.candidates[0],n);let d=await o(`mutation TrustedPublicCandidate($object: candidates_insert_input!) {
      insert_candidates_one(
        object: $object,
        on_conflict: {constraint: candidates_agency_id_idempotency_key_key, update_columns: []}
      ) { ${_} }
    }`,{object:{agency_id:t,first_name:e.firstName,last_name:e.lastName,email:e.email,phone:e.phone,state:e.state,current_occupation:e.currentOccupation,years_experience:e.yearsExperience,why_interested:e.whyInterested,sales_experience:e.salesExperience,financial_services_experience:e.financialServicesExperience,preferred_contact:e.preferredContact,status:"new",score:e.score,score_breakdown:e.scoreBreakdown,idempotency_key:e.idempotencyKey,idempotency_fingerprint:n}});if(d.insert_candidates_one)return d.insert_candidates_one;let u=await o(`query ConcurrentPublicCandidate($agencyId: uuid!, $key: uuid!) {
      candidates(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${_} idempotency_fingerprint
      }
    }`,{agencyId:t,key:e.idempotencyKey});if(!u.candidates[0])throw new i("UPSTREAM_FAILURE");return s(u.candidates[0],n)}async function l(e){let t=await c(e.agencySlug),n=await o(`query ResolvePublicLead($id: uuid!, $agencyId: uuid!) {
      leads(where: {id: {_eq: $id}, agency_id: {_eq: $agencyId}}, limit: 1) { id }
    }`,{id:e.leadId,agencyId:t});if(!n.leads[0])throw new i("LEAD_NOT_FOUND");let r=a({agencyId:t,leadId:e.leadId,date:e.date,time:e.time,meetingType:e.meetingType,notes:e.notes,status:"requested"}),d=await o(`query ExistingPublicAppointment($agencyId: uuid!, $key: uuid!) {
      appointments(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${u} idempotency_fingerprint
      }
    }`,{agencyId:t,key:e.idempotencyKey});if(d.appointments[0])return s(d.appointments[0],r);let _=await o(`mutation TrustedPublicAppointment($object: appointments_insert_input!) {
      insert_appointments_one(
        object: $object,
        on_conflict: {constraint: appointments_agency_id_idempotency_key_key, update_columns: []}
      ) { ${u} }
    }`,{object:{agency_id:t,lead_id:e.leadId,date:e.date,time:e.time,meeting_type:e.meetingType,status:"requested",notes:e.notes,idempotency_key:e.idempotencyKey,idempotency_fingerprint:r}});if(_.insert_appointments_one)return _.insert_appointments_one;let p=await o(`query ConcurrentPublicAppointment($agencyId: uuid!, $key: uuid!) {
      appointments(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${u} idempotency_fingerprint
      }
    }`,{agencyId:t,key:e.idempotencyKey});if(!p.appointments[0])throw new i("UPSTREAM_FAILURE");return s(p.appointments[0],r)}},73569:(e,t,n)=>{"use strict";n.d(t,{p:()=>s});var r=n(63433);let i=process.env.NEXT_PUBLIC_SUPABASE_URL||"",a=process.env.SUPABASE_SERVICE_ROLE_KEY||"",s=i&&a?(0,r.createClient)(i,a,{auth:{autoRefreshToken:!1,persistSession:!1}}):null}};