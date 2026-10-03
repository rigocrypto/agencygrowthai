# AgencyGrowthAI

<p align="center">
  <strong>AI-Powered Growth Operating System for Agencies</strong><br/>
  Leads · Recruiting · Appointments · Campaigns · Analytics · Compliance · RealSona AI
</p>

<p align="center">
  <a href="https://agencygrowthai.netlify.app/"><img src="https://img.shields.io/badge/Live%20Demo-agencygrowthai.netlify.app-0A66C2?style=for-the-badge" alt="Live Demo" /></a>
  <a href="https://github.com/sponsors/rigocrypto"><img src="https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="Sponsor" /></a>
</p>

---

## About AgencyGrowthAI

**AgencyGrowthAI** is a multi-tenant SaaS platform designed to help agencies manage growth, recruiting, client acquisition, appointments, campaigns, analytics, compliance, and AI-assisted daily operations from one secure workspace.

The product combines a traditional agency dashboard with **RealSona AI**, an operational assistant that can help surface priorities, prepare follow-ups, coordinate workflows, and support approved email/calendar actions.

AgencyGrowthAI is being developed as a platform where an agency can move from fragmented tools toward one connected operating system for growth.

---

## What It Can Do

### Growth & Client Acquisition
- Lead capture and qualification
- Financial Checkup intake
- Lead scoring and follow-up workflows
- Appointment scheduling
- Campaign management
- Conversion and activity analytics

### Recruiting
- Candidate intake
- Recruiting pipeline management
- Candidate qualification
- Discovery and licensing workflow support
- Agent-growth visibility

### Agency Operations
- Agent management
- Content workflows
- Compliance and consent records
- Audit visibility
- Dashboard reporting
- Multi-tenant agency separation

### RealSona AI

RealSona is the AI-assistant layer for AgencyGrowthAI. Its evolving capabilities include:

- Daily operational summaries
- Lead prioritization
- Follow-up drafting
- Candidate workflow assistance
- Campaign support
- Human-approval gates
- Email action integration
- Calendar action integration

External provider actions are designed to remain authorization-aware and approval-gated.

---

## Demo Mode

AgencyGrowthAI includes a **Demo Mode** designed to show the product without requiring live customer data or live provider credentials.

The goal is for Demo Mode to remain useful even when external services are unavailable:

```text
Nhost unavailable       → Demo still works
Hasura unavailable      → Demo still works
Email disconnected      → actions are simulated
Calendar disconnected   → actions are simulated
No customer data        → synthetic agency data is used
```

Demo actions should be clearly labeled as simulated and must never be represented as real external writes.

---

## Live Architecture

The live application architecture is built around:

```text
Browser
  ↓
Next.js / React
  ↓
Nhost Auth (JWT)
  ↓
Hasura GraphQL authorization
  ↓
PostgreSQL
  ↓
Tenant-isolated agency data
```

Public intake follows a trusted server-side path rather than allowing direct anonymous database writes.

```text
Public Form
  ↓
Next.js trusted server route
  ↓
Validation + tenant resolution
  ↓
Server-authoritative fields
  ↓
Nhost / Hasura / PostgreSQL
```

---

## Security Model

Security is a core architectural requirement of AgencyGrowthAI.

The project has been designed around:

- JWT-based authentication
- Tenant-scoped authorization
- Hasura row/column permissions
- Deny-by-default public data access
- Server-authoritative public intake
- Cross-tenant attack testing
- Role and identity-spoofing tests
- Idempotent trusted writes
- Public request-size limits
- Rate limiting
- Secret scanning
- Browser-bundle secret checks
- Approval gates for sensitive actions

Current pilot membership model:

```text
1 Auth user
→ 1 agent
→ 1 agency
```

with the invariant:

```text
UNIQUE(agents.user_id)
```

---

## Technology

| Layer | Technology |
|---|---|
| Web application | Next.js 15 |
| UI runtime | React 19 |
| Language | TypeScript |
| Authentication | Nhost Auth |
| API / Authorization | Hasura GraphQL |
| Database | PostgreSQL |
| Deployment | Netlify |
| Testing | Playwright |
| Accessibility | axe-core |
| AI operations | RealSona integration |

---

## Testing & Quality

AgencyGrowthAI uses layered validation rather than relying on a single test suite.

Coverage includes:

- End-to-end browser testing
- Tenant-isolation tests
- Trusted-write tests
- Cross-tenant adversarial tests
- Authentication/session tests
- Idempotency tests
- Public API security tests
- Secret-safety scans
- Accessibility checks
- SEO checks
- Deployment smoke tests

Security regressions are treated as release blockers.

---

## Current Status

AgencyGrowthAI remains under active development and operational hardening.

```text
DEMO MODE                  ACTIVE DEVELOPMENT
LIVE BACKEND               OPERATIONAL HARDENING
REALSONA INTEGRATIONS      ACTIVE DEVELOPMENT
GENERAL PRODUCTION READY   NO
```

The public/demo experience may continue to evolve independently from the live backend. A successful demo does **not** imply that live infrastructure or external provider integrations are production-ready.

---

## Product Vision

The long-term goal is to turn AgencyGrowthAI into an **Agency Growth Operating System** where agencies can manage people, pipeline, productivity, recruiting, marketing, compliance, and AI-assisted work from one secure platform.

Instead of adding another disconnected tool, AgencyGrowthAI aims to become the coordination layer between:

```text
People
+ Pipeline
+ Operations
+ AI
+ Compliance
+ External Tools
```

---

## Support the Project

If you find AgencyGrowthAI useful and want to support continued development, security research, testing, documentation, and open-source work, you can sponsor the project through GitHub Sponsors.

<p align="center">
  <a href="https://github.com/sponsors/rigocrypto">
    <img src="https://img.shields.io/badge/❤%20Sponsor%20AgencyGrowthAI-GitHub%20Sponsors-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="Sponsor AgencyGrowthAI" />
  </a>
</p>

GitHub will also display the repository-level **Sponsor** button when the configured sponsor account is eligible and GitHub Sponsors is enabled.

---

## Security Reporting

Please do **not** disclose suspected vulnerabilities in public issues.

Use GitHub's private security reporting / Security Advisory workflow when available.

---

## Important Notice

AgencyGrowthAI includes financial-agency workflow concepts and Financial Checkup functionality. Public-facing outputs are intended for educational and operational purposes and should not be interpreted as individualized investment, legal, tax, or financial advice.

---

<p align="center">
  <strong>AgencyGrowthAI</strong><br/>
  People · Pipeline · Performance · AI
</p>
