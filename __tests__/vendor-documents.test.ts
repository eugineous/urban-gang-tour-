import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {catalogueProblems} from '@/lib/i18n/messages';
import {vendorMessages} from '@/lib/vendor/messages';

async function generated(kind: 'vendor' | 'sponsor') {
  // A missing generator is a missing deliverable, with an explicit RED assertion.
  expect(existsSync(resolve('lib/vendor/documents.mjs'))).toBe(true);
  const { buildVendorApplication, buildSponsorshipPack } = await import('../lib/vendor/documents.mjs');
  return kind === 'vendor' ? buildVendorApplication() : buildSponsorshipPack();
}

describe('public vendor and partnership documents', () => {
  it('keeps the application at exactly two printable A4 pages', async () => {
    const pdf = await generated('vendor');
    expect(pdf.getNumberOfPages()).toBe(2);
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210, 1);
    expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297, 1);
  });

  it('provides blank application fields, the owner fees, and an honest quote boundary', async () => {
    const raw = (await generated('vendor')).output();
    for (const name of ['applicant_name', 'applicant_type', 'contact_email', 'contact_phone', 'event_name', 'package_choice', 'menu_prices_allergens', 'space_dimensions', 'power_requirements', 'water_handwashing', 'cold_storage', 'food_safety_plan', 'applicant_declaration', 'declaration_name', 'declaration_date']) {
      expect(raw).toContain(`/T (${name})`);
    }
    expect(raw).toContain('30,000-45,000');
    expect(raw).toContain('10,000-15,000');
    expect(raw).toMatch(/Package 1 . Main Vendor/);
    expect(raw).toMatch(/Package 2 . Minor Vendor/);
    expect(raw).toContain('Final written quote');
    expect(raw).toContain('not acceptance or a payment receipt');
    expect(raw).toContain('admin@urbangangtour.co.ke');
    expect(raw).not.toContain('/T (passport');
    expect(raw).not.toContain('/T (bank');
    expect(raw).not.toContain('/T (national_id');
  });

  it('keeps the sponsor pack at two pages with scoped opportunities and no invented audience promise', async () => {
    const pdf = await generated('sponsor');
    expect(pdf.getNumberOfPages()).toBe(2);
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210, 1);
    expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297, 1);
    const raw = pdf.output();
    for (const text of ['Principal / presenting', 'Activation partner', 'Community / in-kind', 'Media / production', 'Quote only', 'outputs', 'outcomes', 'No alcohol or tobacco promotion']) expect(raw).toContain(text);
    expect(raw).not.toMatch(/guaranteed (reach|attendance|sales)|tax.exempt|WHO.approved|UN.certified/i);
  });

  it('ships byte-stable reviewed PDFs with blank printable fields and no executable or submission actions', async () => {
    const {buildVendorApplication,buildSponsorshipPack} = await import('../lib/vendor/documents.mjs');
    const logoData = `data:image/png;base64,${readFileSync(resolve('public/design-assets/logo.png')).toString('base64')}`;
    for (const [name,builder] of [['vendor-application.pdf',buildVendorApplication],['sponsorship-partnership-pack.pdf',buildSponsorshipPack]] as const) {
      const path = resolve('public/downloads', name);
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path), doc = builder({logoData}), raw = doc.output();
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(bytes.equals(Buffer.from(doc.output('arraybuffer')))).toBe(true);
      expect(bytes.equals(Buffer.from(builder({logoData}).output('arraybuffer')))).toBe(true);
      expect(raw).not.toMatch(/\/(?:JavaScript|JS|AA|SubmitForm|ResetForm|Launch|EmbeddedFile|XFA)\b/);
      // jsPDF's OpenAction is a harmless page-view destination, never an action dictionary.
      expect(raw).toMatch(/\/OpenAction \[/);
      const fields = raw.split('endobj').filter(object => /\/FT \/(?:Tx|Btn)\b/.test(object));
      expect(fields.length).toBe(name === 'vendor-application.pdf' ? 26 : 6);
      for (const field of fields) {
        expect(field).toMatch(/\/F 4\b/);
        expect(field).not.toMatch(/\/(?:V|DV) (?!\(\)|\/Off\b)/);
        const rect = field.match(/\/Rect \[([\d. ]+)\]/)?.[1].trim().split(/\s+/).map(Number);
        expect(rect).toHaveLength(4);
        expect(rect![0]).toBeGreaterThanOrEqual(0);
        expect(rect![1]).toBeGreaterThanOrEqual(0);
        expect(rect![2]).toBeLessThanOrEqual(595.3);
        expect(rect![3]).toBeLessThanOrEqual(841.9);
      }
    }
  });

  it('provides complete native-language application guidance without placeholder drift', () => {
    expect(catalogueProblems(vendorMessages)).toEqual([]);
  });
});
