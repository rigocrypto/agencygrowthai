import { existsSync, readFileSync } from 'node:fs';

const required = {
  'qa/nhost-pilot-recovery.md': ['MANUAL_BACKUP_ONLY', 'Auth/Storage'],
  'qa/nhost-production-recovery-runbook.md': ['RESTORING A BACKUP TO THE LIVE PROJECT IS DESTRUCTIVE', 'Phase 2B'],
  'qa/netlify-deployment-rollback-runbook.md': ['last known-good', '/api/health'],
  'qa/incident-response-runbook.md': ['SEV-1', 'evidence'],
  'qa/auth-outage-runbook.md': ['bad credentials', 'synthetic'],
  'qa/graphql-hasura-runbook.md': ['metadata inconsistency', 'tenant'],
  'qa/public-intake-runbook.md': ['429', '21YunBox'],
  'qa/secret-rotation-runbook.md': ['Hasura/Nhost admin secret', 'rollback'],
  'qa/security-incident-runbook.md': ['cross-tenant', 'SEV-1'],
  'qa/agencygrowthai-slo.md': ['error budget', 'RPO'],
  'qa/production-readiness-phase4.md': ['Readiness matrix', 'GENERAL PRODUCTION READINESS'],
};

for (const [path, terms] of Object.entries(required)) {
  if (!existsSync(path)) throw new Error(`MISSING_RUNBOOK_${path}`);
  const text = readFileSync(path, 'utf8');
  for (const term of terms) if (!text.toLowerCase().includes(term.toLowerCase())) throw new Error(`RUNBOOK_TERM_MISSING_${path}_${term}`);
}

console.log(`REQUIRED_OPERATIONAL_ARTIFACTS=${Object.keys(required).length}/11`);
console.log('RECOVERY_WARNING=VERIFIED');
console.log('SEVERITY_MODEL=VERIFIED');
console.log('OPTIONAL_21YUNBOX=DOCUMENTED_NON_BLOCKING');
console.log('RUNBOOK_GUARD=VERIFIED');
