# PR repair decision — 2026-09-26

## Observed graph (refreshed from origin)

- `origin/main`: `98fcdcef8bf55f4417c52d1f86d40258ca3ccc65`
- local `main`: `26b5cbafac95e34a5f75271772f248cba3488c23`, **114 commits** ahead
- `events-reconstruction`: `35f5e47fc891e6af69d4b27f97d311a1d5223dc7`, exactly **one commit** ahead of local `main`
- The merge base of each branch with `origin/main` is `98fcdce`; the merge base of
  `main` and `events-reconstruction` is `26b5cba`.

This proves that PR #29 inherited the unpublished local-main chain. The branch is
not an events-only review unit: the remote comparison is 115 commits and 247 files,
whereas `main..events-reconstruction` is one commit and nine files.

## Commit map

The 114 commits between `origin/main` and local `main` form one linear chain. By
commit subject and changed domain, the initial classification is:

| Boundary | Count | Examples |
| --- | ---: | --- |
| Public/product and content surfaces | 26 | `dd6c47a`, `8ff66b3`, `0146d99` |
| Payment, tickets and inventory | 22 | `0d05673`, `8a424b5`, `09dbc4a`–`14e1139` |
| Control Room authority and operations | 22 | `2dfc348`, `36bd73e`, `17716b1` |
| Organizer work | 5 | `caed8dd`, `ce854fa`, `c9d0022` |
| Documents and production collateral | 19 | `2498416`, `dff9138`, `1c1023d` |
| Tooling/process and mixed supporting work | 20 | `342c76a`, `26b5cba` |

No generated output was found in the committed Events-only delta. The routing
correction is intentionally a separate commit atop the Events commit, not part of
this local-main integration map.

## Chosen repair

Use an integration-first PR, preserving the existing commit chain:

1. Create `integration/main-reconciliation` at `26b5cba` and review it against
   `origin/main` as the 114-commit / 242-file integration boundary.
2. Merge that integration PR with a **merge commit** (not squash/rebase), so the
   original commit SHAs remain ancestors of GitHub `main`.
3. Retarget/recompute PR #29 only after that merge. Its delta will then be the
   Events commit(s), rather than the inherited integration history.

This has the lowest history risk: it preserves every local-main commit, changes no
existing SHA, requires no force push, and leaves the original branches recoverable.
The unrelated `origin/chatgpt/growth-foundation-20260926` branch is not part of
either boundary.

## Explicit exclusions and rollback

- Do not merge PR #29 while its base is `98fcdce`.
- Do not push, force-push, reset `main`, delete branches, or deploy as part of this
  routing checkpoint.
- If review rejects a coherent domain, create a new branch from `origin/main` and
  cherry-pick only that reviewed sequence; this is reversible but changes SHAs and
  is therefore the fallback, not the first choice.
- Until an integration PR is created and merged, the local `main` and
  `events-reconstruction` refs themselves are the rollback points.
