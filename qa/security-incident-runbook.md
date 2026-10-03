# Security incident runbook

Treat suspected cross-tenant access, role/user-ID spoof success, admin/database credential exposure, unexpected direct user insert, or database compromise as SEV-1.

1. Preserve deploy/function/Nhost/Hasura logs, correlation IDs, metadata export/hash, safe counts, Git history, timestamps, and affected IDs. Do not copy PII, payloads, or secrets.
2. Contain the narrowest access path immediately. Disable the affected route/deploy or credential through the owning platform. Never weaken permissions, delete evidence, or modify customer rows speculatively.
3. Determine blast radius using known-ID tenant probes, permission metadata, audit evidence, credential dependencies, deploy history, and repository secret scans.
4. Rotate a suspected secret using the rotation runbook only after evidence preservation and an approved dependency plan. For cross-tenant suspicion, preserve the database and metadata state before cleanup.
5. Recover with a reviewed deploy/metadata version or isolated validated backup. No live destructive restore without explicit approval.
6. Reopen only after Phase 2B adversarial tests, role/header spoof tests, direct-insert/audit-forgery denial, Phase 3A–3C, metadata consistency/hash, client-bundle scan, and clean counts pass.
7. Notify affected stakeholders according to legal/compliance requirements and complete a post-incident review.
