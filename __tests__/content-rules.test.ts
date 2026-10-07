import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { correctShellContent } from '../lib/content-rules';

describe('founders-only original V25 content', () => {
  it('does not offer fabricated captured events as purchasable tickets', () => {
    const out = correctShellContent(readFileSync('app/_rendered/events.html', 'utf8'));
    expect(out).not.toContain('The Experience Hub Dance Event');
    expect(out).not.toContain('Get Tickets</');
    expect(out).toContain('Get Your');
  });
  it('removes entire non-founder cards while preserving both founder cards', () => {
    const html = readFileSync('app/_rendered/gang.html', 'utf8');
    const out = correctShellContent(html);
    expect(out).toContain('Eugine Micah');
    expect(out).toContain('Lucy Ogunde');
    expect(out).not.toContain('Okiyo DaVinci');
    expect(out).not.toContain('Karembo');
    expect(out).not.toContain('Around thirty');
    expect(out.match(/alt="(?:Eugine Micah|Lucy Ogunde)[^"]*"/g)).toHaveLength(2);
  });
  it('removes non-founder homepage headliners without removing the section', () => {
    const out = correctShellContent(readFileSync('app/_rendered/home.html', 'utf8'));
    expect(out).toContain('Headliners');
    expect(out).toContain('Eugine Micah');
    expect(out).not.toContain('george-morgan');
    expect(out).not.toContain('Karembo');
    expect(out).not.toContain('30-PERSON');
  });
  it('does not revive school catalogues in a configured empty gallery capture', () => {
    const out = correctShellContent(readFileSync('app/_rendered/gallery.html', 'utf8'));
    expect(out).toContain('Gallery');
    expect(out).not.toContain('tap a school');
    expect(out).not.toContain('Senior Chief Koinange Girls');
  });
});
