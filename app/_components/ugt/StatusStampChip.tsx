import { StickerChip } from './StickerChip';
import { stampFromEventTruth, type StampTone } from './statusStamp';
import type { EventTruth } from '@/lib/server/event-truth';

export function StatusStamp({
  truth,
  status,
  label,
  tone,
}: {
  truth?: Pick<
    EventTruth,
    'isSellable' | 'isSoldOut' | 'isPostponed' | 'isRescheduled' | 'isCompleted' | 'isCancelled' | 'minPrice'
  >;
  status?: string;
  label?: string;
  tone?: StampTone;
}) {
  const stamp =
    label && tone
      ? { label, tone }
      : truth
        ? stampFromEventTruth(truth, status ?? '')
        : { label: 'Event update', tone: 'cream' as StampTone };
  return <StickerChip tone={stamp.tone}>{stamp.label}</StickerChip>;
}