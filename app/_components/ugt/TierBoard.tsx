import { StickerChip } from './StickerChip';

export type TierBoardTier = {
  name: string;
  price: number;
  sellable: boolean;
  remaining?: number | null;
};

export function TierBoard({ tiers }: { tiers: TierBoardTier[] }) {
  return (
    <ul className="ugt-tier-board">
      {tiers.map((tier) => (
        <li key={tier.name} className={`ugt-tier-board__row${tier.sellable ? '' : ' ugt-tier-board__row--muted'}`}>
          <StickerChip tone={tier.sellable ? 'yellow' : 'cream'} tilt={false}>
            {tier.name}
          </StickerChip>
          <span className="ugt-tier-board__price">
            {new Intl.NumberFormat('en-KE', {
              style: 'currency',
              currency: 'KES',
              maximumFractionDigits: 0,
            }).format(tier.price)}
          </span>
          {!tier.sellable ? <span className="ugt-tier-board__note">Unavailable</span> : null}
        </li>
      ))}
    </ul>
  );
}