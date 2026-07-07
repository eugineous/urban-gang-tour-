'use client';

/**
 * AdUnit — renders a Google AdSense <ins> element.
 * Returns null when NEXT_PUBLIC_ADSENSE_PUB_ID is not set.
 *
 * Props:
 *   slot     {string}  AdSense ad slot ID
 *   format   {string}  Ad format (default: 'auto')
 *   className {string} Optional CSS class
 */
export default function AdUnit({ slot, format, className }) {
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  if (!pubId) return null;

  return (
    <ins
      className={`adsbygoogle${className ? ` ${className}` : ''}`}
      data-ad-client={pubId}
      data-ad-slot={slot}
      data-ad-format={format || 'auto'}
      data-full-width-responsive="true"
    />
  );
}

export { AdUnit };
