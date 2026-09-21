# render-checks/

Scratch output for the screenshot / render / hydration checks
(`scripts/hydration-check.mjs`, `mobile-regression.mjs`, `ticket-shot.mjs`,
`ios-*.mjs`, `migration-visual.mjs`, `audit-doc-templates.mjs`, ...).

Set `SHOTDIR` to write somewhere else. The directories below are gitignored as
a whole, so a check run can never leave the repo dirty:

    render-checks/  screenshots/  test-artifacts/  playwright-report/  tmp/

Deliberately NOT a broad `*.png` ignore rule: a legitimate root-level artwork,
export or logo must never be silently dropped from Git. Keep real deliverables
in a named directory (`docs/`, `public/`) instead.
