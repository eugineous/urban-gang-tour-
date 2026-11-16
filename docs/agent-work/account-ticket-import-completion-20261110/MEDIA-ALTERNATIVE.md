# Website media storage decision — 16 November 2026

The owner now explicitly requests replacing the blocked R2 destination. Supabase
Storage is recommended: a separate media project, with UGT's existing database,
accounts and Paystack integration retained. Cloudinary and Backblaze B2 are other
viable services, but no configured account for either was found in this session.

Connected Supabase discovery found only two inactive unrelated projects.
Do not restore, modify or reuse either. The connected service quotes a new
dedicated project at$0/month. Project
creation requires an organization choice; the owner was asked to select the
existing organization for a dedicated UGT media project. No answer has arrived.
No project, bucket, upload policy, credential or storage migration was created.

The free tier's documented per-file limit is50MB, with separate storage/egress
quotas. A zero project quote is not a promise of unlimited video hosting. Current
storage documentation was consulted and the changelog checked; no SDK/CLI upgrade
or Supabase account/auth migration is proposed.

Once the organization is selected:

1. Create only the dedicated media project and inspect its actual storage limits.
2. Configure server-only administrative upload authority; never expose service
   credentials or allow anonymous writes. Keep private/review media out of public
   buckets and preserve explicit approved-public catalogue projection.
3. Implement and test the storage adapter, bounded uploads, content hashes and
   idempotent resumable import. Preserve source captions and original archives.
4. Migrate approved bytes first, verify full/range/HEAD reads and hashes, then
   switch the website's existing gallery/video endpoints to that destination.
5. Verify scheduled new-only imports separately from storage. Logged-out public
   Instagram discovery remains provider-dependent; never bypass login/private
   content or rate limits. Provide a genuine direct-file upload fallback rather
   than present every Instagram link as guaranteed downloadable.

Existing GitHub archive and publication/schedule decisions remain intact until a
tested destination actually exists. The app's missing GitHub dispatch credential
and runner-specific Instagram discovery failures are independent of R2 billing;
neither becomes fixed merely by choosing a new storage provider.
