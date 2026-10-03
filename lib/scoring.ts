import type { CheckupResponses, FinancialHealthSnapshot, LeadScoreTier } from '@/lib/types';

interface ScoreRule {
  field: keyof CheckupResponses;
  values: { match: string; points: number }[];
}

// Transparent, configurable scoring rules — educational only, no product recommendations
const SCORING_RULES: ScoreRule[] = [
  {
    field: 'household_income_range',
    values: [
      { match: '150k+', points: 20 },
      { match: '100k-150k', points: 15 },
      { match: '75k-100k', points: 10 },
      { match: '50k-75k', points: 7 },
      { match: 'under_50k', points: 3 },
    ],
  },
  {
    field: 'retirement_savings_range',
    values: [
      { match: 'none', points: 18 },
      { match: 'under_25k', points: 15 },
      { match: '25k-100k', points: 10 },
      { match: '100k-500k', points: 6 },
      { match: '500k+', points: 3 },
    ],
  },
  {
    field: 'emergency_savings_range',
    values: [
      { match: 'none', points: 15 },
      { match: 'under_3_months', points: 10 },
      { match: '3-6_months', points: 5 },
      { match: '6+_months', points: 2 },
    ],
  },
  {
    field: 'life_insurance_status',
    values: [
      { match: 'none', points: 15 },
      { match: 'unsure', points: 12 },
      { match: 'employer_only', points: 8 },
      { match: 'individual_policy', points: 3 },
    ],
  },
  {
    field: 'dependents',
    values: [
      { match: '3_or_more', points: 15 },
      { match: '2', points: 12 },
      { match: '1', points: 8 },
      { match: '0', points: 4 },
    ],
  },
  {
    field: 'primary_goal',
    values: [
      { match: 'retirement_planning', points: 15 },
      { match: 'family_protection', points: 15 },
      { match: 'debt_management', points: 12 },
      { match: 'wealth_building', points: 14 },
      { match: 'college_funding', points: 10 },
      { match: 'estate_planning', points: 12 },
    ],
  },
  {
    field: 'age_range',
    values: [
      { match: '55-64', points: 18 },
      { match: '45-54', points: 15 },
      { match: '35-44', points: 12 },
      { match: '25-34', points: 8 },
      { match: '18-24', points: 5 },
      { match: '65+', points: 10 },
    ],
  },
  {
    field: 'preferred_contact_method',
    values: [
      { match: 'phone', points: 10 },
      { match: 'email', points: 7 },
      { match: 'text', points: 8 },
      { match: 'video', points: 12 },
    ],
  },
];

export function scoreLead(responses: CheckupResponses): { score: number; tier: LeadScoreTier } {
  let score = 0;
  for (const rule of SCORING_RULES) {
    const responseValue = responses[rule.field];
    if (typeof responseValue !== 'string') continue;
    const match = rule.values.find((v) => v.match === responseValue);
    if (match) score += match.points;
  }
  if (responses.consent_to_contact) score += 5;
  score = Math.min(score, 100);

  let tier: LeadScoreTier = 'low';
  if (score >= 85) tier = 'priority';
  else if (score >= 70) tier = 'high';
  else if (score >= 40) tier = 'moderate';

  return { score, tier };
}

function band(score: number): { label: string; description: string } {
  if (score >= 75) return { label: 'Strong', description: 'This area appears well-positioned. A periodic review with a professional can help you stay on track.' };
  if (score >= 50) return { label: 'Developing', description: 'This area may benefit from attention. Consider discussing it with a licensed financial professional.' };
  return { label: 'Needs Focus', description: 'Your answers suggest this area may be worth discussing with a properly licensed financial professional.' };
}

export function generateHealthSnapshot(responses: CheckupResponses): FinancialHealthSnapshot {
  const retirementMap: Record<string, number> = {
    none: 15, under_25k: 25, '25k-100k': 50, '100k-500k': 75, '500k+': 90,
  };
  const emergencyMap: Record<string, number> = {
    none: 15, under_3_months: 40, '3-6_months': 70, '6+_months': 90,
  };
  const lifeInsMap: Record<string, number> = {
    none: 20, unsure: 30, employer_only: 50, individual_policy: 80,
  };
  const dependentsMap: Record<string, number> = {
    '0': 70, '1': 55, '2': 45, '3_or_more': 35,
  };
  const goalMap: Record<string, number> = {
    retirement_planning: 65, family_protection: 60, debt_management: 50,
    wealth_building: 70, college_funding: 55, estate_planning: 60,
  };

  const retirementScore = retirementMap[responses.retirement_savings_range] ?? 50;
  const emergencyScore = emergencyMap[responses.emergency_savings_range] ?? 50;
  const familyScore = Math.round(
    (lifeInsMap[responses.life_insurance_status] ?? 50 + dependentsMap[responses.dependents] ?? 50) / 2
  );
  const educationScore = goalMap[responses.primary_goal] ?? 60;
  const longTermScore = Math.round((retirementScore + emergencyScore) / 2);

  const overall = Math.round(
    (retirementScore + emergencyScore + familyScore + educationScore + longTermScore) / 5
  );

  const ret = band(retirementScore);
  const emer = band(emergencyScore);
  const fam = band(familyScore);
  const edu = band(educationScore);
  const lt = band(longTermScore);

  return {
    retirement_preparedness: { score: retirementScore, label: ret.label, description: ret.description },
    emergency_savings: { score: emergencyScore, label: emer.label, description: emer.description },
    family_protection: { score: familyScore, label: fam.label, description: fam.description },
    financial_education: { score: educationScore, label: edu.label, description: edu.description },
    long_term_planning: { score: longTermScore, label: lt.label, description: lt.description },
    overall: {
      score: overall,
      label: overall >= 75 ? 'Healthy' : overall >= 50 ? 'Developing' : 'Needs Focus',
    },
    summary:
      'Your answers indicate areas that may be worth discussing with a properly licensed financial professional. This snapshot is educational only and is not individualized financial, investment, tax, or legal advice.',
  };
}

export function scoreCandidate(responses: {
  years_experience: string;
  sales_experience: string;
  financial_services_experience: string;
  why_interested: string;
  preferred_contact: string;
}): { score: number; breakdown: { interest: number; experience: number; availability: number; communication: number; career_intent: number } } {
  const interest = responses.why_interested.length > 100 ? 20 : responses.why_interested.length > 30 ? 12 : 5;

  const expMap: Record<string, number> = { '0-2': 5, '3-5': 12, '6-10': 18, '10+': 20 };
  const experience = expMap[responses.years_experience] ?? 8;

  const salesMap: Record<string, number> = { none: 5, some: 12, extensive: 20 };
  const salesExp = salesMap[responses.sales_experience] ?? 8;

  const fsMap: Record<string, number> = { none: 5, some: 15, extensive: 20 };
  const fsExp = fsMap[responses.financial_services_experience] ?? 8;

  const contactMap: Record<string, number> = { phone: 15, email: 10, text: 12, video: 18 };
  const communication = contactMap[responses.preferred_contact] ?? 10;

  const career_intent = Math.round((salesExp + fsExp) / 2);

  const score = Math.min(interest + experience + salesExp + fsExp + communication, 100);

  return {
    score,
    breakdown: {
      interest,
      experience,
      availability: communication,
      communication,
      career_intent,
    },
  };
}
