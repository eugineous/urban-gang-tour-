/**
 * Document generator registry guards.
 *
 * The template audit checks each HTML master on disk. These tests check the
 * other half of the contract: the server registry must point at real masters,
 * promo text fields must match stamped data-field hosts, and creative-proof
 * rules must track hero-photo and partner-logo slots.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("../lib/server/db", () => ({
  db: () => null,
  q: vi.fn(async () => []),
  qSchema: vi.fn(async () => undefined),
}));

vi.mock("../lib/server/r2", () => ({
  isR2Url: (url: string) => url.startsWith("https://uploads.example.test/"),
}));

import {
  ACTIVE_DOC_TYPES,
  BAND_TEMPLATES,
  DOC_TYPES,
  PROMO_FIELDS,
  PROMO_HERO_SLOT_COUNTS,
  PROMO_PARTNER_SLOT_TYPES,
  type DocType,
  isPromo,
  resolveTemplates,
} from "../lib/server/docgen";

const templateRoot = path.join(process.cwd(), "public", "doc-templates");
const officialLogo = "URBAN GANG TOUR OFFICIAL LOGO.png";

function readTemplate(file: string): string {
  return readFileSync(path.join(templateRoot, file), "utf8");
}

function fieldsIn(html: string): Set<string> {
  return new Set(
    [...html.matchAll(/\bdata-field="([^"]+)"/gi)].map((match) => match[1]),
  );
}

function heroSlotsIn(html: string): Set<number> {
  return new Set(
    [...html.matchAll(/\bdata-hero-slot="(\d+)"/gi)].map((match) =>
      Number(match[1]),
    ),
  );
}

describe("document generator registry", () => {
  it("keeps every active type registered with a real branded template", () => {
    const codes = new Set<string>();

    for (const type of ACTIVE_DOC_TYPES) {
      const def = DOC_TYPES[type];
      expect(def, `${type} registry entry`).toBeTruthy();
      expect(def.code, `${type} serial code`).toMatch(/^[A-Z0-9-]+$/);
      expect(codes.has(def.code), `${type} duplicate serial code ${def.code}`).toBe(false);
      codes.add(def.code);

      for (const template of resolveTemplates(type, {})) {
        const html = readTemplate(template);
        expect(html, `${type} ${template} data-doc-page`).toMatch(/\bdata-doc-page="/);
        expect(html, `${type} ${template} official logo`).toContain(officialLogo);
      }
    }
  });

  it("keeps every wristband variant wired to a real branded template", () => {
    for (const [bandType, template] of Object.entries(BAND_TEMPLATES)) {
      const html = readTemplate(template);
      expect(html, `${bandType} band page root`).toMatch(/\bdata-doc-page="band"/);
      expect(html, `${bandType} band official logo`).toContain(officialLogo);
    }
  });

  it("keeps promo field whitelists aligned with stamped template fields", () => {
    for (const type of ACTIVE_DOC_TYPES.filter(isPromo)) {
      const template = resolveTemplates(type, {})[0];
      const html = readTemplate(template);
      const stamped = fieldsIn(html);
      const whitelisted = new Set(PROMO_FIELDS[type] || []);

      expect([...whitelisted].sort(), `${type} whitelist`).toEqual(
        [...stamped].sort(),
      );
    }
  });

  it("keeps creative-proof slot counts aligned with template hero slots", () => {
    for (const type of ACTIVE_DOC_TYPES.filter(isPromo)) {
      const template = resolveTemplates(type, {})[0];
      const slots = heroSlotsIn(readTemplate(template));
      const expectedCount = PROMO_HERO_SLOT_COUNTS[type] || 0;
      const expectedSlots = new Set(
        Array.from({ length: expectedCount }, (_, index) => index),
      );

      expect([...slots].sort(), `${type} hero slots`).toEqual(
        [...expectedSlots].sort(),
      );
    }
  });

  it("requires creative-proof partner acknowledgement for every partner strip", () => {
    for (const type of ACTIVE_DOC_TYPES.filter(isPromo)) {
      const template = resolveTemplates(type, {})[0];
      const hasPartnerStrip = /\bdata-partner-strip="1"/.test(readTemplate(template));

      expect(
        PROMO_PARTNER_SLOT_TYPES.has(type as DocType),
        `${type} partner strip proof rule`,
      ).toBe(hasPartnerStrip);
    }
  });
});
