import { describe, expect, it } from 'vitest';
import { UGT_COLORS, UGT_SHADOWS, UGT_TYPE } from '@/app/_components/ugt/tokens';

describe('UGT design tokens', () => {
  it('codifies approved brand primaries without inventing new ones', () => {
    expect(UGT_COLORS.magenta).toBe('#E6218C');
    expect(UGT_COLORS.yellow).toBe('#FFD400');
    expect(UGT_COLORS.cyan).toBe('#21C7E6');
    expect(UGT_COLORS.ink).toBe('#111111');
    expect(UGT_COLORS.cream).toBe('#fffafc');
    expect(UGT_COLORS.night).toBe('#0c0c0c');
    expect(UGT_COLORS.newsGold).toBe('#F7A81B');
    expect(UGT_COLORS.whatsapp).toBe('#25D366');
  });

  it('exposes neo-brutal hard shadows and type role faces', () => {
    expect(UGT_SHADOWS.money).toContain('magenta');
    expect(UGT_TYPE.display.toLowerCase()).toContain('anton');
    expect(UGT_TYPE.slogan.toLowerCase()).toContain('permanent marker');
    expect(UGT_TYPE.body.toLowerCase()).toContain('space grotesk');
  });
});

import * as primitives from '@/app/_components/ugt/index';

describe('ugt primitives barrel', () => {
  it('exports sticker system components', () => {
    for (const name of ['PosterCard', 'StickerChip', 'MoneyButton', 'GhostButton', 'InkButton', 'PathCard']) {
      expect(typeof (primitives as Record<string, unknown>)[name]).toBe('function');
    }
  });
});

import { stampFromEventTruth } from '@/app/_components/ugt/statusStamp';

describe('stampFromEventTruth', () => {
  const base = {
    isSellable: false, isSoldOut: false, isPostponed: false, isRescheduled: false,
    isCompleted: false, isCancelled: false, minPrice: null as number | null,
  };
  it('never paints On sale when not sellable', () => {
    expect(stampFromEventTruth(base, 'published').label).toBe('Event update');
  });
  it('uses sold out / postponed / rescheduled truthfully', () => {
    expect(stampFromEventTruth({ ...base, isSoldOut: true }, 'sold_out').label).toBe('Sold out');
    expect(stampFromEventTruth({ ...base, isPostponed: true }, 'postponed').label).toBe('Postponed');
    expect(stampFromEventTruth({ ...base, isRescheduled: true }, 'rescheduled').label).toBe('Rescheduled');
  });
  it('shows From price only when sellable and minPrice known', () => {
    expect(stampFromEventTruth({ ...base, isSellable: true, minPrice: 500 }, 'published').label).toMatch(/From/);
    expect(stampFromEventTruth({ ...base, isSellable: true, minPrice: null }, 'published').label).toBe('On sale');
  });
});