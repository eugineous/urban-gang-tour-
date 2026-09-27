export const UGT_COLORS = {
  magenta: '#E6218C',
  yellow: '#FFD400',
  cyan: '#21C7E6',
  ink: '#111111',
  cream: '#fffafc',
  blush: '#f8f4ec',
  blushAlt: '#f1ede5',
  blushWarm: '#f7f2e9',
  night: '#0c0c0c',
  newsInk: '#1A0E14',
  newsGold: '#F7A81B',
  whatsapp: '#25D366',
} as const;

export const UGT_SHADOWS = {
  sm: '3px 3px 0 var(--ugt-ink)',
  md: '5px 6px 0 var(--ugt-ink)',
  lg: '8px 8px 0 var(--ugt-ink)',
  money: '3px 3px 0 var(--ugt-magenta)',
} as const;

export const UGT_TYPE = {
  display: "'Anton', 'Arial Black', sans-serif",
  slogan: "'Permanent Marker', cursive",
  body: "'Space Grotesk', Arial, sans-serif",
  newsDisplay: "'Titan One', cursive",
  newsBody: "'Archivo', sans-serif",
  mono: "'Spline Sans Mono', ui-monospace, monospace",
} as const;