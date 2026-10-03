# Security Policy

AgencyGrowthAI takes security seriously. The project handles authentication, tenant-isolated business data, public lead and recruiting intake, appointments, compliance-related records, and other sensitive workflows. Security reports are therefore reviewed with priority.

## Supported Versions

AgencyGrowthAI is currently under active development and has not yet established a formal long-term release-support schedule.

| Version / Branch                 | Supported          |
| -------------------------------- | ------------------ |
| `main` / latest verified release | :white_check_mark: |
| Current pilot release            | :white_check_mark: |
| Older development builds         | :x:                |
| Deprecated branches or forks     | :x:                |

Security fixes are applied to the latest actively maintained version. Older snapshots, abandoned branches, forks, and unsupported deployments may not receive security updates.

This table will be updated once AgencyGrowthAI adopts formal semantic versioning and a stable release lifecycle.

## Reporting a Vulnerability

Please do **not** report security vulnerabilities through public GitHub Issues, Discussions, pull requests, social media, or other public channels.

Use **GitHub Private Vulnerability Reporting** for this repository whenever available.

When submitting a report, please include as much of the following information as possible:

* A clear description of the vulnerability.
* The affected component, route, API, page, or feature.
* Steps required to reproduce the issue.
* Proof-of-concept information where appropriate.
* The security impact you believe is possible.
* Whether authentication is required.
* Whether the issue affects one tenant or could cross tenant boundaries.
* Relevant HTTP requests, GraphQL operations, logs, or screenshots with secrets and personal information removed.
* Suggested remediation, if known.

Do not include passwords, access tokens, refresh tokens, JWTs, Hasura administrative secrets, Nhost administrative secrets, database credentials, private customer information, or other sensitive credentials in a report unless a secure reporting channel has specifically been established for that purpose.

## Security Response Process

After a vulnerability is submitted, the project will:

1. Acknowledge receipt as soon as reasonably possible.
2. Review and reproduce the reported behavior.
3. Determine severity, exploitability, and affected components.
4. Classify the report as accepted, informational, duplicate, not reproducible, or declined.
5. Develop and validate a remediation when required.
6. Run relevant regression and security tests before releasing the fix.
7. Coordinate disclosure when appropriate.

Reporters may be asked for additional technical details if the vulnerability cannot initially be reproduced.

Accepted reports will be tracked privately until a remediation or disclosure decision has been made.

## High-Priority Security Areas

Reports involving the following areas are especially important:

* Cross-tenant data access.
* Authentication or session bypass.
* Authorization bypass.
* Nhost or Hasura permission bypass.
* Tenant membership manipulation.
* Role or identity spoofing.
* Unauthorized GraphQL queries or mutations.
* Exposure of administrative credentials.
* Exposure of database credentials.
* Public-route privilege escalation.
* Forged `agency_id`, `user_id`, or ownership fields.
* Lead, appointment, candidate, consent, audit, or event forgery.
* Server-side request forgery.
* SQL injection.
* Remote code execution.
* Stored or reflected cross-site scripting.
* CSRF affecting privileged operations.
* Authentication token leakage.
* Sensitive information disclosure.
* Durable idempotency bypass leading to unauthorized or duplicate operations.
* Rate-limit or abuse-control bypass with meaningful security impact.
* Dependency or software-supply-chain compromise.

## Multi-Tenant Security

AgencyGrowthAI uses a multi-tenant architecture.

A user must never be able to access or modify another agency's records unless explicitly authorized by the application security model.

Potential cross-tenant vulnerabilities should be treated as high priority, including unauthorized access to:

* Agencies.
* Agents.
* Leads.
* Lead events.
* Appointments.
* Candidates.
* Candidate events.
* Campaigns.
* Campaign events.
* Content assets.
* Content reviews.
* AI interactions.
* Consents.
* Audit logs.
* Settings.

The application must not rely on client-supplied tenant identifiers as an authorization boundary.

## Responsible Testing

Security research must be conducted responsibly.

Please:

* Test only against accounts, tenants, and data you are authorized to use.
* Use synthetic test data whenever possible.
* Avoid accessing real customer or third-party information.
* Avoid destructive testing.
* Avoid deleting or corrupting data.
* Avoid denial-of-service testing.
* Avoid excessive automated traffic.
* Avoid social engineering.
* Avoid attempts to obtain credentials belonging to other users.
* Stop testing if you unexpectedly gain access to sensitive information.

If sensitive information is encountered unintentionally, stop further access and report the issue privately.

## Out of Scope

The following generally do not qualify as security vulnerabilities unless they create a demonstrable security impact:

* Missing cosmetic security headers without an exploitable condition.
* UI or UX issues with no security impact.
* Self-XSS requiring the victim to execute attacker-provided code manually.
* Clickjacking on pages with no sensitive action.
* Automated scanner reports without demonstrated exploitability.
* Dependency-version reports without a reachable vulnerable code path or meaningful impact.
* Rate-limit observations that do not enable abuse or security impact.
* Denial-of-service tests requiring excessive or harmful traffic.
* Issues affecting unsupported forks or modified deployments.

## Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing a vulnerability.

The project may publish a GitHub Security Advisory or release notes describing:

* The affected versions.
* Security impact.
* Remediation.
* Upgrade guidance.
* Relevant mitigations.

Reporter credit may be provided when appropriate and when the reporter wishes to be acknowledged.

## Security Architecture

AgencyGrowthAI currently uses security controls including:

* Nhost authentication.
* Real JWT-based user identity.
* Hasura row- and column-level authorization.
* Tenant-scoped GraphQL permissions.
* Single-agency membership enforcement.
* Server-authoritative public intake routes.
* Deny-by-default public application permissions.
* Restricted authenticated mutations.
* Server-only administrative credentials.
* Cross-tenant adversarial testing.
* Static authorization-boundary guards.
* Durable request-idempotency protections.
* Request-size validation.
* Secret scanning and environment-file protections.

Security controls continue to evolve as AgencyGrowthAI moves from development toward controlled pilot and production environments.

## Security Contact

Preferred reporting channel:

**GitHub Private Vulnerability Reporting / Security Advisories for this repository.**

Do not open a public issue for a suspected vulnerability.
