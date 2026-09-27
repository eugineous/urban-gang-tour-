import type { EventTruth } from '@/lib/server/event-truth';

export type StampTone = 'yellow' | 'cyan' | 'ink' | 'magenta' | 'cream';

export function stampFromEventTruth(
  truth: Pick<
    EventTruth,
    'isSellable' | 'isSoldOut' | 'isPostponed' | 'isRescheduled' | 'isCompleted' | 'isCancelled' | 'minPrice'
  >,
  _status: string,
): { label: string; tone: StampTone } {
  if (truth.isSoldOut) return { label: 'Sold out', tone: 'ink' };
  if (truth.isCancelled) return { label: 'Cancelled', tone: 'ink' };
  if (truth.isPostponed) return { label: 'Postponed', tone: 'magenta' };
  if (truth.isRescheduled) return { label: 'Rescheduled', tone: 'magenta' };
  if (truth.isCompleted) return { label: 'Ended', tone: 'cream' };
  if (truth.isSellable) {
    if (truth.minPrice !== null) {
      const price = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        maximumFractionDigits: 0,
      }).format(truth.minPrice);
      return { label: `From ${price}`, tone: 'yellow' };
    }
    return { label: 'On sale', tone: 'yellow' };
  }
  return { label: 'Event update', tone: 'cream' };
}