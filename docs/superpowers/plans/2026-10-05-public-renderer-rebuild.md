# Public Renderer Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the double-rendered V25 public experience with a founder-led, responsive React surface that keeps real routes and commerce flows functional.

**Architecture:** `RenderedPage` becomes a single modern route composer backed by a typed public content model and one client interaction layer for navigation and motion. Existing server routes, SEO metadata, payment APIs, organizer workflows and legal pages remain authoritative; the visual shell delegates to them through real URLs rather than reimplementing them.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, existing local assets and APIs, Vitest, Playwright.

**Spec:** `PRODUCT.md`, `DESIGN.md`, and the user's October 5, 2026 rebuild direction.

## Global Constraints

- Render no V25 source, template fetch, template binding, or second interactive runtime on public pages.
- Preserve existing URLs, metadata, server-validated checkout, rate limits, auth boundaries and public/private data separation.
- Public people content contains only Eugine Micah and Lucy Ogunde.
- Use real local media, responsive images, visible focus, reduced motion and a five-item mobile navigation.
- Local preview only; do not deploy or alter production data.

## Review Focus

- A template URL must redirect home without showing raw `{{ bindings }}`.
- Desktop and phone layouts must have no horizontal overflow or obscured bottom actions.
- Empty event/shop data must still produce a useful route and an actionable next step.
- Navigation and purchase/book actions must remain real links or existing protected API workflows.
- Account/auth errors must have recovery copy without exposing account existence or private data.

### Task 1: Define the public content contract

**Files:** Create `app/_components/public-site-content.ts`; Test `__tests__/public-site-content.test.ts`.

- [ ] Add a failing test asserting the shared navigation has five mobile destinations and only two public founders.
- [ ] Implement typed route content, media references and founder data.
- [ ] Run `npm test -- __tests__/public-site-content.test.ts`.

### Task 2: Replace the legacy public renderer

**Files:** Create `app/_components/PublicSite.tsx`, `app/_components/public-site.module.css`; Modify `app/_components/RenderedPage.tsx`, `app/layout.tsx`, `app/globals.css`.

- [ ] Implement one semantic, responsive React shell for home, about, founder, gallery, shop, booking, experience, partner and contact routes.
- [ ] Remove legacy renderer/runtime from visitor paths and suppress old global overlays only when the new shell is active.
- [ ] Run TypeScript and Vitest.

### Task 3: Make account and founder content coherent

**Files:** Modify `app/the-gang/page.tsx`, `app/account/AccountApp.tsx`; Test `__tests__/public-site-content.test.ts`.

- [ ] Replace the public crew directory and stale account copy with founder-only, labelled input/recovery states.
- [ ] Run TypeScript and focused tests.

### Task 4: Verify on localhost

**Files:** Create `.impeccable/review/desktop.png`, `.impeccable/review/mobile.png`; Modify only material defects found.

- [ ] Run build/type/test checks, Playwright desktop/mobile route checks, V25 redirect verification, and one Impeccable detector pass.
- [ ] Open the localhost preview in Codex and report exact preview URL.
