import {afterEach, describe, expect, it, vi} from 'vitest';
import {INTERFACE_LOCALES} from '@/lib/i18n/locale';
import {formatCalendarDay, formatInterfaceNumber, formatKes, formatNairobiTime} from '@/lib/i18n/format';

afterEach(() => vi.unstubAllEnvs());

describe('presentation-only native interface formatting', () => {
  it('keeps KES explicit and preserves fractional amounts', () => {
    expect(formatKes(1234.5,'en')).toBe('KES 1,234.5');
    expect(formatKes(1234.5,'fr')).toContain('KES');
    for (const locale of INTERFACE_LOCALES) {
      const amount = 1234.56;
      expect(formatKes(amount,locale)).toBe(`KES ${formatInterfaceNumber(amount,locale)}`);
      expect(amount).toBe(1234.56);
    }
    expect(formatKes(0,'en')).toBe('KES 0');
    expect(formatKes(-12.5,'en')).toBe('KES -12.5');
  });
  it('rejects non-finite amounts instead of fabricating a zero or currency value', () => {
    expect(formatKes(Number.NaN,'en')).toBeNull();
    for (const value of [NaN,Infinity,-Infinity,'001234',null,undefined]) {
      expect(formatKes(value as number,'en')).toBeNull();
      expect(formatInterfaceNumber(value as number,'en')).toBeNull();
    }
  });
  it('uses a bounded region hint with the explicit interface language', () => {
    expect(formatInterfaceNumber(1234.5,'en','DE')).toBe(new Intl.NumberFormat('en-DE',{maximumFractionDigits:2}).format(1234.5));
    expect(formatInterfaceNumber(1234.5,'fr','CA')).toBe(new Intl.NumberFormat('fr-CA',{maximumFractionDigits:2}).format(1234.5));
    for (const region of ['fr-FR','auto','DE-u-nu-arab','<script>','x'.repeat(100),'']) {
      expect(formatInterfaceNumber(1234.5,'en',region)).toBe(formatInterfaceNumber(1234.5,'en'));
    }
  });
  it('validates ISO calendar days including leap days and never exposes Invalid Date', () => {
    expect(formatCalendarDay('2026-02-30','en')).toBeNull();
    for (const value of ['2026-02-29','2026-13-01','2026-00-01','2026-01-00','2026-04-31','2026-2-01','2026-10-26T00:00:00Z','invalid','']) expect(formatCalendarDay(value,'en')).toBeNull();
    expect(formatCalendarDay('2024-02-29','en')).not.toBeNull();
    expect(formatCalendarDay('2026-10-26','en','long')).toContain('October');
    expect(formatCalendarDay('2026-10-26','fr','long')).toContain('octobre');
    expect(formatCalendarDay('2026-10-26','en','short')).not.toBe(formatCalendarDay('2026-10-26','en','long'));
  });
  it.each(['2026-10-26','2026-03-08','2026-11-01'])('preserves the venue day %s across visitor time zones and DST boundaries', day => {
    vi.stubEnv('TZ','America/Los_Angeles');
    const venueDay = formatCalendarDay(day,'en');
    vi.stubEnv('TZ','Pacific/Auckland');
    expect(formatCalendarDay(day,'en')).toBe(venueDay);
    expect(venueDay).toContain(day.slice(-2).replace(/^0/,''));
  });
  it('formats explicitly zoned instants in Africa/Nairobi with a visible zone', () => {
    const instant = '2026-10-25T22:30:00Z';
    const expected = new Intl.DateTimeFormat('en-KE',{hour:'numeric',minute:'2-digit',timeZone:'Africa/Nairobi',timeZoneName:'short'}).format(new Date(instant));
    expect(formatNairobiTime(instant,'en')).toBe(expected);
    expect(formatNairobiTime('2026-10-26T01:30:00+03:00','en')).toBe(expected);
    vi.stubEnv('TZ','America/Los_Angeles');
    const venueTime = formatNairobiTime(instant,'fr');
    vi.stubEnv('TZ','Pacific/Auckland');
    expect(formatNairobiTime(instant,'fr')).toBe(venueTime);
  });
  it('rejects unzoned, rolled-over or malformed instants', () => {
    for (const value of ['invalid','2026-10-26','2026-10-26T09:00:00','2026-02-30T09:00:00Z','2026-10-26T24:00:00Z','2026-10-26T12:60:00Z','']) expect(formatNairobiTime(value,'en')).toBeNull();
  });
});
