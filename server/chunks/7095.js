"use strict";exports.id=7095,exports.ids=[7095],exports.modules={27095:(e,n,i)=>{i.d(n,{P:()=>s,y:()=>a});let t="AI-generated draft — requires human/compliance review before publication.",a=new class{async summarizeLead(e){let n=e.score>=85?"priority":e.score>=70?"high":e.score>=40?"moderate":"low",i=[];e.interest&&i.push(e.interest),e.checkup&&(("none"===e.checkup.retirement_savings_range||"under_25k"===e.checkup.retirement_savings_range)&&i.push("Retirement preparedness gap"),("none"===e.checkup.life_insurance_status||"unsure"===e.checkup.life_insurance_status)&&i.push("Family protection review"),"none"===e.checkup.emergency_savings_range&&i.push("Emergency savings"));let t=`${e.name} is a ${n} intent lead currently in ${e.status} status${e.interest?` with interest in ${e.interest.toLowerCase()}`:""}. Lead score: ${e.score}/100. Key discussion topics: ${i.join(", ")||"general financial education"}.`;return{summary:t,intent:n,topics:i.length?i:["General financial education"],suggested_priority:({priority:"Contact within 24 hours — high engagement signal",high:"Contact within 48 hours — strong interest indicators",moderate:"Contact within 1 week — nurture with educational content",low:"Add to long-term nurture sequence"})[n]}}async summarizeCandidate(e){let n=e.score>=80?"priority":e.score>=60?"high":e.score>=35?"moderate":"low",i=`${e.name} is a ${e.occupation} with ${e.experience} of professional experience. Candidate score: ${e.score}/100. Motivation: ${e.why_interested.substring(0,100)}...`,t=e.score>=80?"Schedule discovery call within 48 hours":e.score>=60?"Schedule discovery call within 1 week":"Add to nurture sequence";return{summary:i,intent:n,topics:["Career transition timeline","Licensing requirements","Training program","Compensation structure"],suggested_priority:t}}async suggestFollowUpTopics(e){let n=["Share an educational article about their area of interest","Invite to an upcoming educational webinar","Send a neutral summary of common planning considerations"];return e.interest&&n.unshift(`Provide educational resources about ${e.interest.toLowerCase()}`),"nurture"===e.status&&n.push("Share a financial wellness checklist"),n}async summarizeCampaign(e){let n=e.leads>0?Math.round(e.qualified/e.leads*100):0,i=e.leads>0?Math.round(e.appointments/e.leads*100):0;return`${e.name} has generated ${e.leads} leads, with ${e.qualified} qualified (${n}%) and ${e.appointments} appointments (${i} conversion). ${n>50?"This campaign is performing above average in lead quality.":n>25?"Lead quality is moderate — consider refining targeting.":"Lead quality is low — review audience targeting and messaging."}`}async explainMetric(e,n){let i={total_leads:`Total leads represents all prospects who have submitted their information. You currently have ${n} leads in your pipeline.`,qualified_leads:`Qualified leads are those scored 40+ or marked as qualified. You have ${n} qualified leads ready for outreach.`,appointments:`Scheduled appointments include all meetings in scheduled, confirmed, or completed status. You have ${n} active appointments.`,conversion_rate:`Lead-to-appointment conversion measures pipeline efficiency. Your current rate is ${n}%.`,recruiting_candidates:`Recruiting candidates are individuals who expressed interest in a financial services career. You have ${n} active candidates.`,active_agents:`Active agents are currently licensed and producing. You have ${n} active agents.`,campaign_roi:`Campaign ROI estimates return on marketing spend based on client acquisition. Your current estimated ROI is ${n}%.`};return i[e]||`This metric currently shows: ${n}`}async generateContentDraft(e){return({social_post:(e,n)=>({title:`Social Media Post — ${e}`,content:`Did you know? Understanding ${e.toLowerCase()} is one of the most important steps in financial wellness.

Whether you're just starting out or reviewing your current plan, education comes first.

This post is for ${n}. Get your free financial health snapshot at our link in bio.

#FinancialEducation #FinancialWellness #PlanningForTheFuture

${t}`,compliance_label:t}),email:(e,n)=>({title:`Email Campaign — ${e}`,content:`Subject: Understanding ${e} — Educational Resources Inside

Dear [First Name],

At Horizon Financial Group, we believe financial education should come before any conversation about products. That's why we're sharing resources about ${e.toLowerCase()}.

This email is for ${n} who want to better understand their financial picture.

This message is for educational purposes only and is not individualized financial, investment, tax, or legal advice.

${t}`,compliance_label:t}),educational_article:(e,n)=>({title:`Educational Article — ${e}`,content:`# Understanding ${e}

## Why It Matters
${e} is a key component of financial wellness for ${n}. Understanding the basics can help you make more informed decisions about your financial future.

## Key Concepts
1. Start with education, not products
2. Understand your current situation
3. Consider speaking with a licensed professional
4. Review your plan regularly

## Next Steps
Consider scheduling an educational consultation to discuss your individual circumstances.

This article is for educational purposes only and does not constitute individualized financial, investment, tax, or legal advice. It does not recommend any specific insurance, investment, or annuity product.

${t}`,compliance_label:t})})[e.type](e.topic,e.audience)}},s=["AI must not recommend specific insurance, investment, or annuity products","AI must not recommend securities or promise returns","AI must not guarantee retirement outcomes or income","AI must not determine that a financial product is suitable for a person","AI must not impersonate a licensed financial professional","AI must not provide personalized investment advice","All AI-generated financial marketing content requires human/compliance review","AI-generated content can never be automatically published"]}};