// AI service layer — abstracted so any provider (OpenAI, Anthropic, Gemini) can be swapped later.
// The MVP uses a deterministic local engine that classifies, summarizes, and drafts content
// WITHOUT ever making financial product recommendations.

export interface AISummaryResult {
  summary: string;
  intent: 'low' | 'moderate' | 'high' | 'priority';
  topics: string[];
  suggested_priority: string;
}

export interface AIContentDraft {
  title: string;
  content: string;
  compliance_label: string;
}

export interface AIProvider {
  summarizeLead(leadData: {
    name: string;
    interest: string | null;
    score: number;
    status: string;
    checkup: Record<string, string> | null;
  }): Promise<AISummaryResult>;

  summarizeCandidate(candidateData: {
    name: string;
    score: number;
    occupation: string;
    experience: string;
    why_interested: string;
  }): Promise<AISummaryResult>;

  suggestFollowUpTopics(leadData: { name: string; interest: string | null; status: string }): Promise<string[]>;

  summarizeCampaign(campaignData: {
    name: string;
    leads: number;
    qualified: number;
    appointments: number;
  }): Promise<string>;

  explainMetric(metric: string, value: number | string): Promise<string>;

  generateContentDraft(params: {
    type: 'social_post' | 'email' | 'educational_article';
    topic: string;
    audience: string;
  }): Promise<AIContentDraft>;
}

const COMPLIANCE_LABEL = 'AI-generated draft — requires human/compliance review before publication.';

// DEMO AI engine — deterministic, local, no external API calls.
// Does NOT recommend products, securities, or promise returns.
class DemoAIProvider implements AIProvider {
  async summarizeLead(leadData: {
    name: string;
    interest: string | null;
    score: number;
    status: string;
    checkup: Record<string, string> | null;
  }): Promise<AISummaryResult> {
    const intent = leadData.score >= 85 ? 'priority' : leadData.score >= 70 ? 'high' : leadData.score >= 40 ? 'moderate' : 'low';
    const topics: string[] = [];
    if (leadData.interest) topics.push(leadData.interest);
    if (leadData.checkup) {
      if (leadData.checkup.retirement_savings_range === 'none' || leadData.checkup.retirement_savings_range === 'under_25k') {
        topics.push('Retirement preparedness gap');
      }
      if (leadData.checkup.life_insurance_status === 'none' || leadData.checkup.life_insurance_status === 'unsure') {
        topics.push('Family protection review');
      }
      if (leadData.checkup.emergency_savings_range === 'none') {
        topics.push('Emergency savings');
      }
    }
    const summary = `${leadData.name} is a ${intent} intent lead currently in ${leadData.status} status${
      leadData.interest ? ` with interest in ${leadData.interest.toLowerCase()}` : ''
    }. Lead score: ${leadData.score}/100. Key discussion topics: ${topics.join(', ') || 'general financial education'}.`;

    const priorityMap = {
      priority: 'Contact within 24 hours — high engagement signal',
      high: 'Contact within 48 hours — strong interest indicators',
      moderate: 'Contact within 1 week — nurture with educational content',
      low: 'Add to long-term nurture sequence',
    };

    return {
      summary,
      intent,
      topics: topics.length ? topics : ['General financial education'],
      suggested_priority: priorityMap[intent],
    };
  }

  async summarizeCandidate(candidateData: {
    name: string;
    score: number;
    occupation: string;
    experience: string;
    why_interested: string;
  }): Promise<AISummaryResult> {
    const intent = candidateData.score >= 80 ? 'priority' : candidateData.score >= 60 ? 'high' : candidateData.score >= 35 ? 'moderate' : 'low';
    const summary = `${candidateData.name} is a ${candidateData.occupation} with ${candidateData.experience} of professional experience. Candidate score: ${candidateData.score}/100. Motivation: ${candidateData.why_interested.substring(0, 100)}...`;
    const topics = ['Career transition timeline', 'Licensing requirements', 'Training program', 'Compensation structure'];
    const priority = candidateData.score >= 80 ? 'Schedule discovery call within 48 hours' : candidateData.score >= 60 ? 'Schedule discovery call within 1 week' : 'Add to nurture sequence';
    return { summary, intent, topics, suggested_priority: priority };
  }

  async suggestFollowUpTopics(leadData: { name: string; interest: string | null; status: string }): Promise<string[]> {
    const base = [
      'Share an educational article about their area of interest',
      'Invite to an upcoming educational webinar',
      'Send a neutral summary of common planning considerations',
    ];
    if (leadData.interest) {
      base.unshift(`Provide educational resources about ${leadData.interest.toLowerCase()}`);
    }
    if (leadData.status === 'nurture') {
      base.push('Share a financial wellness checklist');
    }
    return base;
  }

  async summarizeCampaign(campaignData: {
    name: string;
    leads: number;
    qualified: number;
    appointments: number;
  }): Promise<string> {
    const qualRate = campaignData.leads > 0 ? Math.round((campaignData.qualified / campaignData.leads) * 100) : 0;
    const aptRate = campaignData.leads > 0 ? Math.round((campaignData.appointments / campaignData.leads) * 100) : 0;
    return `${campaignData.name} has generated ${campaignData.leads} leads, with ${campaignData.qualified} qualified (${qualRate}%) and ${campaignData.appointments} appointments (${aptRate} conversion). ${qualRate > 50 ? 'This campaign is performing above average in lead quality.' : qualRate > 25 ? 'Lead quality is moderate — consider refining targeting.' : 'Lead quality is low — review audience targeting and messaging.'}`;
  }

  async explainMetric(metric: string, value: number | string): Promise<string> {
    const explanations: Record<string, string> = {
      total_leads: `Total leads represents all prospects who have submitted their information. You currently have ${value} leads in your pipeline.`,
      qualified_leads: `Qualified leads are those scored 40+ or marked as qualified. You have ${value} qualified leads ready for outreach.`,
      appointments: `Scheduled appointments include all meetings in scheduled, confirmed, or completed status. You have ${value} active appointments.`,
      conversion_rate: `Lead-to-appointment conversion measures pipeline efficiency. Your current rate is ${value}%.`,
      recruiting_candidates: `Recruiting candidates are individuals who expressed interest in a financial services career. You have ${value} active candidates.`,
      active_agents: `Active agents are currently licensed and producing. You have ${value} active agents.`,
      campaign_roi: `Campaign ROI estimates return on marketing spend based on client acquisition. Your current estimated ROI is ${value}%.`,
    };
    return explanations[metric] || `This metric currently shows: ${value}`;
  }

  async generateContentDraft(params: {
    type: 'social_post' | 'email' | 'educational_article';
    topic: string;
    audience: string;
  }): Promise<AIContentDraft> {
    const templates: Record<string, (topic: string, audience: string) => AIContentDraft> = {
      social_post: (topic, audience) => ({
        title: `Social Media Post — ${topic}`,
        content: `Did you know? Understanding ${topic.toLowerCase()} is one of the most important steps in financial wellness.\n\nWhether you're just starting out or reviewing your current plan, education comes first.\n\nThis post is for ${audience}. Get your free financial health snapshot at our link in bio.\n\n#FinancialEducation #FinancialWellness #PlanningForTheFuture\n\n${COMPLIANCE_LABEL}`,
        compliance_label: COMPLIANCE_LABEL,
      }),
      email: (topic, audience) => ({
        title: `Email Campaign — ${topic}`,
        content: `Subject: Understanding ${topic} — Educational Resources Inside\n\nDear [First Name],\n\nAt Horizon Financial Group, we believe financial education should come before any conversation about products. That's why we're sharing resources about ${topic.toLowerCase()}.\n\nThis email is for ${audience} who want to better understand their financial picture.\n\nThis message is for educational purposes only and is not individualized financial, investment, tax, or legal advice.\n\n${COMPLIANCE_LABEL}`,
        compliance_label: COMPLIANCE_LABEL,
      }),
      educational_article: (topic, audience) => ({
        title: `Educational Article — ${topic}`,
        content: `# Understanding ${topic}\n\n## Why It Matters\n${topic} is a key component of financial wellness for ${audience}. Understanding the basics can help you make more informed decisions about your financial future.\n\n## Key Concepts\n1. Start with education, not products\n2. Understand your current situation\n3. Consider speaking with a licensed professional\n4. Review your plan regularly\n\n## Next Steps\nConsider scheduling an educational consultation to discuss your individual circumstances.\n\nThis article is for educational purposes only and does not constitute individualized financial, investment, tax, or legal advice. It does not recommend any specific insurance, investment, or annuity product.\n\n${COMPLIANCE_LABEL}`,
        compliance_label: COMPLIANCE_LABEL,
      }),
    };

    return templates[params.type](params.topic, params.audience);
  }
}

export const aiProvider: AIProvider = new DemoAIProvider();

// CRITICAL: These guard rails are enforced regardless of provider.
// AI must NEVER make financial product recommendations.
export const AI_GUARDRAILS = [
  'AI must not recommend specific insurance, investment, or annuity products',
  'AI must not recommend securities or promise returns',
  'AI must not guarantee retirement outcomes or income',
  'AI must not determine that a financial product is suitable for a person',
  'AI must not impersonate a licensed financial professional',
  'AI must not provide personalized investment advice',
  'All AI-generated financial marketing content requires human/compliance review',
  'AI-generated content can never be automatically published',
] as const;
