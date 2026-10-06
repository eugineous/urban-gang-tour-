# Public UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a rich, phone-first public Urban Gang Tour experience across all public routes without altering backend or admin behavior.

**Architecture:** Keep the existing App Router, captured v25 desktop experience and public route structure. Repair the mobile shell so the five dedicated task surfaces remain app-like while every secondary public route keeps a readable SSR fallback beneath the same header and bottom navigation.

**Tech Stack:** Next.js App Router, React client components, CSS, existing public media.

**Spec:** `PRODUCT.md`, `DESIGN.md`

## Global Constraints

- No admin redesign or backend contract changes.
- Preserve public URLs, structured data, public media and existing interactions.
- Use only existing public assets and verified links.
- Verify desktop and a 390px phone viewport before handoff.

## Review Focus

- Secondary mobile routes must not be blank after the v25 boot attempt.
- Fixed navigation must not conceal content or safe-area controls.
- Bottom navigation must have five labelled, touch-friendly destinations.
- No visual regression may remove the desktop v25 surface.
- Reduced-motion users keep all content and navigation available.

### Task 1: Establish a public mobile app shell

**Files:**
- Modify: `app/_components/MobileApp.tsx`
- Modify: `app/globals.css`

- [ ] Render the same five labelled bottom destinations on primary and secondary public routes.
- [ ] Prevent the desktop runtime from replacing secondary phone routes with an empty mount point.
- [ ] Restore maximalist media-led CSS, safe areas, focus states and reduced-motion fallback.

### Task 2: Verify the rebuilt public surface

**Files:**
- Test: public routes at desktop and 390px mobile widths

- [ ] Run type/build checks.
- [ ] Capture homepage and a secondary route at desktop and mobile widths.
- [ ] Fix material overflow, blank-route or navigation defects in one batch.
