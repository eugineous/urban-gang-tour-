# Urban Gang Tour full flow sweep

Uses TesterArmy's `e2e` SDK and `@e2e-dev/web` browser engine from https://github.com/tester-army/e2e. Deterministic assertions need no AI model or paid provider; telemetry is disabled for these runs.

1. From the application root run `npm run cf:build`, then `node scripts/prepare-flow-runtime.mjs /tmp/ugt-flow-runtime`. Start the direct Miniflare runtime using the command it prints. Preparation performs a dry-run bundle only; it never deploys. The frozen copy avoids source watchers, and direct Miniflare avoids the Wrangler preview proxy crash observed during this sweep.
2. From this folder run `npm ci` and start a fresh Chromium profile in a separate terminal with `chromium --headless --no-sandbox --remote-debugging-port=9224 --user-data-dir=/tmp/ugt-flow-browser`.
3. Run `E2E_TELEMETRY_DISABLED=1 npx e2e run --output results`.

Do not reuse a browser profile carrying a previous run’s service workers: the SDK can attach to a stale worker target during the first homepage snapshot. A fresh CDP browser resolves that test-adapter failure. Keep service-worker unit coverage and native browser checks separate.

Targets: 390, 820 and 1440 pixels. All backend writes are intercepted with fictional data or blocked. This suite verifies browser interactions and access UI, not a real bank charge or delivery to an inbox. Actual server ownership, signature, settlement and inventory boundaries are covered separately by the root Vitest suite. Full route/link inventory: `node scripts/full-flow-inventory.mjs` from the root. Run `scripts/live-commerce-regression.mjs`, existing auth, admin and Reels regression scripts alongside this suite; their fixtures protect the real backend.

For Safari-engine coverage install the matching Playwright WebKit browser and its system libraries, then run `node scripts/safari-flow-smoke.mjs` from the application root. Device widths simulate layouts; they do not substitute for physical iOS/Android device checks.
