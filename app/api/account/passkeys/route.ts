import {passkeyGet,passkeyPost} from '@/lib/server/customer-passkeys';

// GET: active buyer's own safe key metadata only.
// POST: discoverable login is public; registration/revoke require an active
// buyer, and registration options/revoke additionally verify their password.
export const GET=passkeyGet;
export const POST=passkeyPost;
