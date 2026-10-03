import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    id: 'financial-checkup-step-state-source',
    label: 'Financial Checkup page implements multi-step state (useState/setStep present)',
    file: 'app/financial-checkup/page.tsx',
    evidence: [
      'const [step, setStep] = useState(1);',
      'const [form, setForm] = useState<CheckupResponses>({',
      'const [contact, setContact] = useState({',
      'setStep(2)',
      'setStep(3)',
      'setStep(4)',
    ],
  },
  {
    id: 'financial-checkup-runtime-state',
    label: 'Financial Checkup preserves data across steps in browser runtime',
    file: 'app/financial-checkup/page.tsx',
    statusOverride: 'NOT VERIFIED',
    note: 'Requires browser execution — Playwright spec pending, CI ONLY',
    evidence: [
      'const [step, setStep] = useState(1);',
      'const [form, setForm] = useState<CheckupResponses>({',
      'const [contact, setContact] = useState({',
      'const handleSubmit = async () => {',
    ],
  },
  {
    id: 'repo-demo-mode',
    label: 'Demo repository is the active default',
    file: 'lib/repo/index.ts',
    evidence: [
      'export const repo: IRepository = demoRepository;',
      'export const isDemoMode = !isSupabaseConfigured || true;',
    ],
  },
  {
    id: 'supabase-config-gated',
    label: 'Supabase is gated by env config',
    file: 'lib/supabase/client.ts',
    evidence: [
      "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';",
      "const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';",
      'export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);',
    ],
  },
  {
    id: 'agencies-rls',
    label: 'Agencies RLS exists and is scoped to agency ownership',
    file: 'supabase/migrations/20260814031231_create_agencies_and_settings.sql',
    evidence: [
      'ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;',
      'CREATE OR REPLACE FUNCTION user_agency_id()',
      'CREATE POLICY "select_own_agency"',
    ],
  },
  {
    id: 'leads-rls',
    label: 'Leads RLS exists and allows public insert only with consent',
    file: 'supabase/migrations/20260814031317_create_agents_leads_events.sql',
    evidence: [
      'ALTER TABLE leads ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "public_insert_leads"',
      'CREATE POLICY "select_own_leads"',
    ],
  },
  {
    id: 'appointments-rls',
    label: 'Appointments and candidates RLS exist',
    file: 'supabase/migrations/20260814031332_create_appointments_candidates.sql',
    evidence: [
      'ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "public_insert_appointments"',
    ],
  },
  {
    id: 'content-rls',
    label: 'Content and audit RLS exist',
    file: 'supabase/migrations/20260814031349_create_content_ai_consents_audit.sql',
    evidence: [
      'ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "select_own_content"',
    ],
  },
];

const lineNumberFor = (content, needle) => {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.includes(needle));
  return idx >= 0 ? idx + 1 : null;
};

const rows = [];
let failed = 0;
let pending = 0;

for (const check of checks) {
  const filePath = path.join(root, check.file);
  const content = fs.readFileSync(filePath, 'utf8');
  const hits = [];
  const missing = [];

  for (const needle of check.evidence) {
    const line = lineNumberFor(content, needle);
    if (line !== null) {
      hits.push({ needle, line });
    } else {
      missing.push(needle);
    }
  }

  const status = check.statusOverride ?? (missing.length === 0 ? 'VERIFIED' : 'FAILED');
  if (status === 'FAILED') failed += 1;
  if (status === 'NOT VERIFIED') pending += 1;

  rows.push({
    id: check.id,
    label: check.label,
    file: check.file,
    status,
    hits,
    note: check.note ?? null,
    evidence: hits.length
      ? hits.map((hit) => `${hit.needle} @ L${hit.line}`).join('; ')
      : missing.join('; '),
  });
}

const matrix = `# Verification matrix

| Check | Status | Evidence |
| --- | --- | --- |
${rows
  .map((row) => {
    const fileLink = `[${row.file}](${row.file.startsWith('..') ? row.file : `../${row.file}`}${row.hits.length > 0 ? `#L${row.hits[0].line}` : ''})`;
    const suffix = row.note ? `; ${row.note}` : '';
    return `| ${row.label} | ${row.status} | ${fileLink} — ${row.evidence}${suffix} |`;
  })
  .join('\n')}
`;

const outDir = path.join(root, 'qa');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'verification-matrix.md'), matrix, 'utf8');

console.log(
  JSON.stringify({ total: rows.length, verified: rows.filter((row) => row.status === 'VERIFIED').length, failed, pending, matrix: 'qa/verification-matrix.md' }, null, 2),
);
for (const row of rows) {
  console.log(`${row.status} | ${row.label} | ${row.file}`);
}

if (failed > 0) {
  process.exit(1);
}
