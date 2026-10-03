# AgencyGrowthAI Phase 4A security remediation

Date: 2026-09-08

This record covers only the Phase 4A dependency, credential, and regression gate. It does not declare general production readiness and does not authorize Supabase data import or multi-agency expansion.

## Checkpoint and toolchain

| Item | Before | After |
| --- | --- | --- |
| Git checkpoint | `1a05b0def567663c2fcb3d3119572d4fb8ae42c9` | `ade5579b6d9a56450380fac403e4bcadc3d100fd` (verified code commit) |
| Node | `24.14.0` | `24.14.0` |
| npm | `11.9.0` | `11.9.0` |
| Next.js | `13.5.1` | `15.5.24` Maintenance LTS |
| React / React DOM | `18.2.0` | `19.2.8` |
| TypeScript | `5.2.2` | `5.2.2` |
| ESLint | `8.49.0` | `8.57.1` |
| eslint-config-next | `13.5.1` | `15.5.24` |

The official Next.js `next-async-request-api` codemod was run with `--dry --print`. It proposed no edits. The Next build type generator subsequently identified one client dynamic-route prop that required a manual `Promise<{id:string}>` plus React `use()` migration.

## Production audit inventory before remediation

Baseline: 1 critical, 14 high, 4 moderate, 1 low; 20 affected package entries.

| Package | Severity | Direct | Affected range | Dependency path / reachability | Remediation owner |
| --- | --- | --- | --- | --- | --- |
| `@babel/runtime` | moderate | no | `<7.26.10` | UI transitive; browser reachable | transitive refresh |
| `@typescript-eslint/parser` | high | no | `6.16.0-7.5.0` | eslint-config-next; dev only | eslint-config-next |
| `@typescript-eslint/typescript-estree` | high | no | `6.16.0-7.5.0` | eslint-config-next; dev only | eslint-config-next |
| `ajv` | moderate | no | `<6.14.0` | ESLint; dev only | ESLint |
| `brace-expansion` | high | no | `<=1.1.17` or `2.0.0-2.1.3` | ESLint/Tailwind; dev only | tooling tree |
| `browserslist` | high | no | `<=4.28.6` | Autoprefixer; build only | Autoprefixer |
| `cross-spawn` | high | no | `7.0.0-7.0.4` | ESLint/Tailwind; dev only | tooling tree |
| `flatted` | high | no | `<=3.4.1` | ESLint; dev only | ESLint |
| `glob` | high | no | `10.2.0-10.4.5` | Tailwind/Sucrase; build only | Tailwind tree |
| `js-yaml` | high | no | `4.0.0-4.3.0` | ESLint; dev only | ESLint |
| `lodash` | high | no | `<=4.17.23` | Recharts 2; analytics browser path reachable | Recharts |
| `minimatch` | high | no | `<=3.1.3` or `9.0.0-9.0.6` | ESLint/Tailwind; dev only | tooling tree |
| `nanoid` | high | no | `<=3.3.17` | PostCSS; build path | PostCSS tree |
| `next` | critical | yes | aggregate `0.9.9-15.5.20` | App Router runtime; reachable | application owner |
| `picomatch` | high | no | `<=2.3.1` | Tailwind/Fast Glob; build only | Tailwind tree |
| `postcss` | high | yes | `<=8.5.22` | CSS build and Next internal copy | application / Next override |
| `postcss-selector-parser` | low | no | `6.1.0-6.1.2` | Tailwind; build only | Tailwind tree |
| `ws` | high | no | `8.0.0-8.20.1` | Supabase Realtime fallback; runtime reachable only in Supabase mode | Supabase SDK |
| `yaml` | moderate | no | `2.0.0-2.8.2` | Tailwind config; build only | Tailwind tree |
| `zod` | moderate | no | `<=3.22.2` | Next internal | Next.js |

Runtime remediation was explicit: Next 15.5.24, React 19, Supabase JS 2.116.0, Recharts 3, React-19-compatible UI peers, and PostCSS 8.5.28. Build/lint-only packages were correctly moved to `devDependencies`. Because Next 15.5.24 pins PostCSS 8.4.31, a root override to PostCSS 8.5.28 is required; builds and regressions validate that same-major substitution.

The first post-upgrade Netlify build completed the Next.js compilation but failed while packaging the pre-existing `user-agent-blocker` edge extension because its `@netlify/blobs` import was unresolved. The official package is now pinned explicitly at `11.0.3`; the production audit, clean install, Next build, types, lint, and bundle-secret checks were repeated afterward. The extension was preserved rather than disabled.

After remediation, `npm audit --omit=dev` reports 0 critical, 0 high, 0 moderate, 0 low. The full audit reports 0 critical, 7 high, 2 moderate, 1 low, all in dev-only ESLint/Tailwind dependency paths. They do not ship in the production install or browser/server runtime; replacing those legacy toolchains is separate maintenance and no `audit fix --force` was used.

## Next.js advisory inventory for the former 13.5.1 baseline

The npm advisory database reported the following Next.js advisories against the former lockfile:

| Severity | Advisory | Summary / codebase relevance |
| --- | --- | --- |
| critical | GHSA-f82v-jwr5-mffw | Middleware authorization bypass. No middleware exists here, but the vulnerable framework was reachable and is remediated. |
| high | GHSA-fr5h-rqp8-mj6g | Server Action SSRF. No Server Actions exist. |
| high | GHSA-gp8f-8m3g-qvj9 | Cache poisoning. Framework-level relevance. |
| high | GHSA-7gfc-8cq8-jh5f | Authorization bypass. Framework-level relevance. |
| high | GHSA-mwv6-3258-q52c | Server Components denial of service. App Router relevance. |
| high | GHSA-5j59-xgg2-r9c4 | Server Components denial-of-service follow-up. App Router relevance. |
| high | GHSA-h25m-26qc-wcjf | RSC request deserialization denial of service. App Router relevance. |
| high | GHSA-q4gf-8mx6-v5v3 | Server Components denial of service. App Router relevance. |
| high | GHSA-8h8q-6873-q5fj | Server Components denial of service. App Router relevance. |
| high | GHSA-c4j6-fc7j-m34r | WebSocket-upgrade SSRF. Framework runtime relevance. |
| high | GHSA-36qx-fr4f-26g5 | Pages Router i18n middleware bypass. No Pages Router or i18n configuration. |
| high | GHSA-m99w-x7hq-7vfj | App Router Server Action denial of service. App Router present; no app-defined Server Actions. |
| high | GHSA-p9j2-gv94-2wf4 | Rewrite SSRF. No Next rewrite configuration exists. |
| moderate | GHSA-g77x-44xx-532m | Image optimization denial of service. Images are configured unoptimized. |
| moderate | GHSA-7m27-7ghc-44w9 | Server Action denial of service. No Server Actions exist. |
| moderate | GHSA-g5qg-72qw-gw5v | Image optimizer cache-key confusion. Images are configured unoptimized. |
| moderate | GHSA-4342-x723-ch2f | Middleware redirect SSRF. No middleware exists. |
| moderate | GHSA-xv57-4mr9-wg8v | Image optimization content injection. Images are configured unoptimized. |
| moderate | GHSA-9g9p-9gw9-jx7f | Image optimizer remote-pattern denial of service. No remote patterns; unoptimized images. |
| moderate | GHSA-ggv3-7p47-pfv8 | Request smuggling in rewrites. No Next rewrites. |
| moderate | GHSA-3x4c-7xq6-9pq8 | Image optimizer disk-cache exhaustion. Unoptimized images. |
| moderate | GHSA-ffhc-5mcf-pf4q | App Router CSP nonce XSS. No CSP nonce integration. |
| moderate | GHSA-gx5p-jg67-6x7h | `beforeInteractive` script XSS. No such scripts. |
| moderate | GHSA-h64f-5h5j-jqjh | Image optimization denial of service. Unoptimized images. |
| moderate | GHSA-68g3-v927-f742 | Request-body cache confusion. Framework-level relevance. |
| moderate | GHSA-4633-3j49-mh5q | Invalid-UTF-8 request-body cache confusion. Framework-level relevance. |
| moderate | GHSA-4c39-4ccg-62r3 | Edge Server Action payload bound. No Server Actions or Edge runtime. |
| moderate | GHSA-955p-x3mx-jcvp | Server Function endpoint disclosure. No app-defined Server Functions. |
| low | GHSA-3h52-269p-cp9r | Dev-server origin exposure. Local development only. |
| low | GHSA-qpjv-v59x-3qc4 | Cache-poisoning race. Framework-level relevance. |
| low | GHSA-3g8h-86w9-wvmq | Middleware/proxy redirect cache poisoning. No middleware. |
| low | GHSA-vfv6-92ff-j949 | RSC cache-busting collision. App Router relevance. |

## Breaking-change and React 19 review

| Area | Finding / action |
| --- | --- |
| App Router | Used throughout; retained. |
| `cookies()`, `headers()`, `draftMode()` | No usage. |
| `params` | One client dynamic page migrated to a Promise and React `use()`. |
| `searchParams` | No page prop usage. |
| Middleware | None. It is not an authorization boundary. |
| Server Actions | None. |
| Route handlers | Health plus three trusted public intake POST routes; no cache assumption changed. |
| Fetch caching | Server fetches are health/intake operations and do not depend on the old default GET cache. |
| Next image/font/link | `next/font` and `next/link` used; no legacy `@next/font` or legacy Link markup. Images are unoptimized. |
| Metadata | Static Metadata API only; no async migration. |
| Redirects/rewrites | No Next config redirects/rewrites. Netlify rate-limit redirect remains separate. |
| React Hook Form / Radix | React 19-compatible tree verified; Radix packages refreshed within declared semver ranges. |
| Recharts | Recharts 3 removes vulnerable Lodash path; tooltip/legend/pie label types migrated. |
| React Day Picker | v9 migration applied for the unified Chevron component. |
| Nhost/Hasura | SDK transport unchanged; real-JWT regressions are the authority. |
| Playwright/axe | Test-only, React-independent; test harness retained. |

## Authorization and evidence policy

The dashboard layout still requires a restored session and redirects anonymous users to `/login`. Hasura permissions remain the tenant authorization boundary. Trusted anonymous intake remains server-authoritative. The dedicated `x-middleware-subrequest` regression sends two known spoof forms and requires both redirect and absence of protected dashboard text.

All Nhost credential-entry Playwright configurations keep trace, screenshot, and video off. General demo tests may retain retry traces because they never use real Nhost credentials. Passwords, tokens, sessions, emails, and reset tokens are never printed by the rotation verifier.

## Verification ledger

| Gate | Evidence |
| --- | --- |
| `npm ci` | VERIFIED; clean lockfile install succeeded. |
| Lint | VERIFIED; `eslint .` passed. |
| Typecheck | VERIFIED; `tsc --noEmit` passed. |
| Builds | VERIFIED; demo, Nhost, and Supabase modes compiled on Next 15.5.24. |
| Local middleware bypass | VERIFIED; 2/2 spoof variants blocked. |
| Static Nhost boundary guards | VERIFIED. |
| Phase 3A/3B/3C static guards | VERIFIED. |
| E2E | VERIFIED; 43/43 passed. |
| Accessibility | VERIFIED; 11/11 passed. |
| SEO | VERIFIED; 9/9 passed. |
| Artifact scan | VERIFIED; password, pair, JWT, actual secret value, database URI, and Git-history hit counts all zero. |
| Bundle scan | VERIFIED; browser/generated secret values, JWT literals, and database credentials all zero. |
| Remote baseline | VERIFIED; 2 Auth users, 2 agencies, 2 agents, zero business rows, metadata consistent, hash `4C6BA10DD46799F66E86889A7B9F9AE5D413D12CCC5E604083C42D0C1D64A034`. |
| User A rotation | VERIFIED behaviorally; the former locally stored password was rejected with HTTP 401, while the replacement completed real login, produced a session, retained verified-email state, bound the JWT user ID to the authenticated user, and carried effective Hasura role `user`. No credential value was printed or persisted in an artifact. |
| Phase 2B runtime | VERIFIED; tenant isolation/adversarial suite passed, fixtures were cleaned, and metadata hash before/after remained `4C6BA10DD46799F66E86889A7B9F9AE5D413D12CCC5E604083C42D0C1D64A034`. |
| Phase 3A runtime | VERIFIED; 3/3 real-session read-path tests passed and fixtures were cleaned. |
| Phase 3B runtime | VERIFIED; 4/4 trusted-write and adversarial tests passed. The browser login redirect wait was aligned with the existing 60-second Next development compilation allowance; no application/Auth/permission behavior was weakened. Final business counts were zero and the metadata hash was unchanged. |
| Phase 3C runtime | VERIFIED; 7/7 deployed-pilot tests passed after the Nhost Auth rate-limit cooldown. Setup now captures the clean baseline before authentication so an early external auth rejection cannot create a misleading teardown hash error. Final business counts were zero and the metadata hash was unchanged. |
| Netlify deploy and live gates | Executed only after this ledger and every pre-deploy gate passed; the resulting immutable deploy ID, deployed Git SHA, live middleware probe, and post-deploy Phase 3C evidence are recorded in the final Phase 4A operator handoff and Netlify history. |
