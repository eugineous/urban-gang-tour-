# Zero-cost media, publishing and usability handover

Owner asks for implementation and a complete handover, including defensive
security testing. The standing consolidated instruction rejects repeated plan
approval loops. Execute this scoped work, preserving the working application.

## Intended outcome

UGT staff can find the media controls, add owned content and understand storage
limits. Visitors can scan merchandise on a phone, search and navigate without
unnecessary scrolling. Editors can use narrowly scoped, revocable access from
Codex or a documented ChatGPT action to create a reviewable event draft.

## Design direction

Product: Kenyan events, hosting, merchandise and editorial work, with staff tools.
Character: energetic, direct, assured. World: stage posters and a working newsroom.
Moment: owned photographs, complete event posters and visible merchandise.
Signature: magenta primary actions and the existing centred mobile Home control.
Concept: let the work attract attention and make the next action obvious.

Keep the MOOKH/Nixtio public shell, Eventify phone navigation and shop-specific
Mkurugenzi styling. The explicit new shop exception is a two-column phone grid
inspired by Jumia/Kilimall browsing density. No imported brand logos or invented
catalogue items, ratings, discounts, broadcasters, affiliations or TV licences.

## Cost and data constraints

- Supabase/R2 project creation is dropped. No new paid storage or automatic
  upgrade. Do not delete existing archives, accounts or customer records.
- Audit actual current plans/usage read-only. A free allowance is not unlimited
  hosting and cannot erase already-incurred charges. Do not cancel shared
  services until a safe replacement and its effect are concrete and reviewable.
- Keep existing media storage and existing public-video archive/embeds where
  practical; enforce bounded uploads and a persistent conservative storage budget
  before expanding native upload types. Long videos may use an owned YouTube
  link. Do not claim any Instagram URL can always be downloaded.
- Do not migrate accounts/orders to Supabase. Preserve payment flags, verified
  settlement, account IDs, guest capabilities, existing content and publication.

## Work units and acceptance

1. Shop: preserve current artwork/fonts/colours and category-only URLs. At320px
   and390px, show two merchandise cards side by side with readable price/name,
   full contained imagery and44px primary controls. Search/sort/variants/cart and
   direct product links retain their real behavior. Reduced-motion touch/focus
   feedback must work without hiding content.
2. Media/admin: label a clear Media entry; expose image/poster upload, bounded
   native video where the current store can support it, captions, preview,
   download and honest Instagram progress/failure/retry. Preserve owner rights,
   deduplication and manual publication. Put a hard cap ahead of any extra storage
   spending. Source quality cannot be reconstructed by compression.
3. Connected tools: owner-only issuance/revocation of hashed expiring scoped
   credentials. Only upload event-poster images and create event drafts; no
   financial, publishing, user-management or general admin authority. Bounded
   inputs, issuer audit, distributed abuse limits, ownership checks and revocation
   precede writes. Never create a live key/account/event for tests. Provide a real
   OpenAPI contract and local Codex CLI, with explicit ChatGPT setup and limits.
4. Public craft/discovery: Book Us replaces the requested host booking label in
   all six native languages. Keep verified names in biographies. Audit navigation,
   back-to-top, search, image/touch states and popup obstruction before fixing.
   Preserve authored article text, consent, motion exceptions and private URLs.
5. Security/SEO/cost: inventory routes and exposure; test auth/roles/ownership,
   Origin, uploads, SSRF/path input, stored markup, rate budgets and financial
   capabilities locally. Verify metadata/sitemaps/indexability and query actual
   Search Console only if connected. Report measured limitations; no ranking,
   capacity or penetration-test completeness claims without evidence.

## Execution and proof

Independent shop/tool writers use separate existing linked worktrees. Security
and SEO/cost investigations are read-only until coordinated. Root owns media,
navigation/copy, integration and one final whole-branch review. Skills applied:
Product Design Audit, Charles Unslop(CC-BY-4.0 attribution retained), Cloudflare
performance/runtime guidance, isolated worktrees, test-first behavior changes and
verification before completion. Small reversible copy/style changes use rendered
verification rather than unnecessary unit tests.

Capture fresh before/after screens, keep meaningful targeted regression and
isolated SQL/browser proofs, then one combined suite/types/lint/build. Use normal
PR merge and keep-vars deployment with live read-only checks. No live financial,
customer-message/account-creation tests, destructive scanning or secret rotation.
Deliver a concise owner guide, integration setup, cost table and security findings
with exactly what was tested and what remains an operator dependency.
