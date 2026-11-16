import type {Metadata} from 'next';
export const metadata:Metadata={title:'Connect event draft tools | Urban Gang Tour',robots:{index:false,follow:false}};
export default function ConnectedToolsGuide(){return <article style={{maxWidth:760,margin:'40px auto',padding:24,lineHeight:1.7}}>
 <h1>Connect event draft tools</h1>
 <p>The owner issues an expiring credential in Control Room → Connected tools. Choose poster upload and event draft access. Copy the credential once and keep it private. Revoke it there when access should stop.</p>
 <h2>Use local Codex</h2>
 <p>With Node 20 or newer, set <code>UGT_EDITOR_TOKEN</code> in your environment or save it in the ignored repository file <code>.ugt-editor-token</code> with file permissions <code>600</code>. Never put the credential in a prompt or event JSON.</p>
 <ol><li>Run <code>node scripts/editor-tools.mjs upload /path/poster.jpg</code> for an owned PNG, JPEG or WebP poster up to 5 MiB.</li><li>Save the returned <code>posterId</code> in an event JSON file with a UUID v4 <code>requestId</code>, confirmed <code>name</code> and <code>kind</code> (<code>school</code>, <code>ticketed</code> or <code>past</code>).</li><li>Run <code>node scripts/editor-tools.mjs draft event.json</code>. Keep that file and request ID unchanged for retries after an uncertain response.</li><li>Review the draft in Events and publish manually when ready.</li></ol>
 <p>Optional fields: eventDate (YYYY-MM-DD), eventTime, venue, city and description. Leave unconfirmed details out. Posters must belong to the same credential. Drafts have no ticket tiers or sales configuration.</p>
 <h2>Use a private ChatGPT Action</h2>
 <p>If custom GPT Actions are available on your account, import the <a href="/api/editor-tools/openapi">OpenAPI contract</a> in your private GPT’s Actions configuration. Select API Key authentication with Bearer authorization and enter the owner-issued credential. This requires manual setup; the website does not connect your ChatGPT account automatically.</p>
 <p>Attach one owned PNG, JPEG or WebP poster up to 5 MiB. Ask ChatGPT to call uploadEventPoster, then createEventDraft with confirmed text and the returned posterId. Both calls must use the same credential. Keep the GPT private. ChatGPT may ask you to confirm writes.</p>
 <p>Actions supplies a short-lived attachment link; this API accepts only the exact documented OpenAI file host, checks the image bytes and never follows redirects or forwards credentials. If the link expires or is unsupported, attach the poster again or use the local CLI. A draft-only credential can prepare text for staff to complete.</p>
 <p>Official setup references: <a href="https://developers.openai.com/api/docs/actions/authentication">Action authentication</a> and <a href="https://developers.openai.com/api/docs/actions/sending-files">Action file transport</a>. Account and workspace availability may vary.</p>
 <h2>Limits and access</h2>
 <p>Credentials expire within 30 days and permit up to 6 successful writes per minute and 30 per day, subject to the existing storage cap. They cannot publish, edit existing events, take payments, sell tickets or manage people. After a successful revocation, future requests fail.</p>
 <p>The repository guide <code>docs/integrations/connected-tools.md</code> contains the full operator setup, retry behavior and isolated test instructions.</p>
 </article>}
