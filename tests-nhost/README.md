# Nhost Phase 2B security suite

`phase2b-runtime-security.mjs` authenticates both test users with real Nhost Auth sessions, verifies tenant-scoped reads and updates, and runs known-ID, row-transfer, membership, role, identity-header, insert, audit/event, public-access, and duplicate-membership attacks.

Credentials and administrative test access are loaded only from ignored `.env` and `.env.test.local` files. Never commit those files.

Run:

```powershell
npm run test:nhost:guards
npm run test:nhost
```

Phase 3A application verification uses only ignored local credentials and starts the
application in explicit `nhost` mode without changing the default repository:

```powershell
npm run test:nhost:phase3a:guards
npm run test:nhost:phase3a
npm run test:nhost:secrets
```

The Phase 3A repository is read-only. Every Nhost write method fails with
`NHOST_WRITE_PATH_NOT_ENABLED`; trusted writes remain a Phase 3B concern.
