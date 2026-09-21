// Kenya DPA / ODPC hooks. UGT works with youth and schools. Do not collect
// a child's personal phone or email merely to issue a ticket when an adult
// buyer can represent the purchase. These helpers record CONSENT SHAPE, not
// a claim that processing is already compliant.

export const CONSENT_PURPOSES = [
  'transactional',
  'marketing',
  'media_identifiable',
  'guardian_child_data',
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export function isConsentPurpose(v: unknown): v is ConsentPurpose {
  return (CONSENT_PURPOSES as readonly string[]).includes(String(v));
}

/**
 * Marketing must never be bundled with the transactional notice required to
 * complete a ticket purchase.
 */
export function consentsAreSeparate(given: {
  transactional: boolean;
  marketing: boolean;
}): boolean {
  return given.transactional === true && given.marketing !== given.transactional
    ? true
    : given.transactional === true;
}

export function requiresGuardianConsent(opts: {
  subjectIsMinor: boolean;
  collectsPersonalData: boolean;
  identifiableMedia: boolean;
}): boolean {
  if (!opts.subjectIsMinor) return false;
  return opts.collectsPersonalData || opts.identifiableMedia;
}
