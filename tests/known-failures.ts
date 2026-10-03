/*
Known-failing tests, by name.

"25 passed / 18 failed" is not a baseline — it is a number nobody reads. A nineteenth
failure looks identical to the eighteen that were expected, so a real regression arrives
invisible. The baseline has to be the names.

scripts/check-baseline.mjs compares a run against this list and fails when:
  - a test outside the list fails  -> a regression
  - a test inside the list passes  -> the list is stale, someone fixed it, remove the entry

Each entry says why it fails and what closes it. Entries are debts, not exemptions.
*/

export type KnownFailure = { title: string; reason: string };

export const KNOWN_FAILURES: KnownFailure[] = [];
