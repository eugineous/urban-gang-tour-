'use client';

export function VariantChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="ugt-variant-chips" role="listbox" aria-label="Variants">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="option"
            aria-selected={selected}
            className={`ugt-variant-chips__chip${selected ? ' is-selected' : ''}`}
            onClick={() => onChange?.(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}