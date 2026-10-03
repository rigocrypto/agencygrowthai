# GraphQL and Hasura runbook

1. Separate expected authorization/validation denial from outage: 400/401/403 for an invalid or cross-tenant request is not a service failure; network errors, invalid upstream responses, 5xx, or widespread valid-query failures are.
2. Correlate request/deploy ID with the sanitized `TRUSTED_NHOST_GRAPHQL_FAILURE` log. It records status/error count only, never GraphQL messages, variables, payloads, tokens, or admin secrets.
3. Check `/api/health`, Nhost/Hasura health and logs, metadata consistency/inconsistent objects, current metadata hash, database connectivity, and the latest deploy.
4. Metadata inconsistency or suspected permission/tenant regression is SEV-1. Contain public/agent access; export metadata for evidence; do not reload/apply metadata or weaken permissions during diagnosis.
5. Application-only regression may use the Netlify rollback runbook if schema/metadata compatible. Database recovery follows the Nhost recovery runbook.
6. Close only after metadata consistency, reviewed hash, Phase 2B adversarial suite, Phase 3A/3B/3C, known-ID cross-tenant probes, and clean row counts pass.
