import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { hasDb, q, qSchema } from './db';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const INTEGRATION_ID = 'gmail';

type StoredGmail = {
  refreshToken: string;
  email: string;
  scope: string;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  unread: boolean;
  messageId: string;
  references: string;
};

let schemaReady: Promise<void> | null = null;

export function ensureGmailSchema(): Promise<void> {
  if (!hasDb()) return Promise.reject(new Error('db_not_configured'));
  if (!schemaReady) {
    schemaReady = qSchema(`
      CREATE TABLE IF NOT EXISTS admin_integrations (
        id TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'dev-secret-change-me') throw new Error('session_secret_not_configured');
  return createHash('sha256').update(`ugt:gmail:${secret}`).digest();
}

function encrypt(value: StoredGmail): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decrypt(value: string): StoredGmail {
  const [ivText, tagText, ciphertextText] = value.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('gmail_secret_invalid');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext) as StoredGmail;
}

function googleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) throw new Error('google_oauth_not_configured');
  return { clientId, clientSecret };
}

export async function gmailConnection(): Promise<{ connected: boolean; email?: string; updatedAt?: string }> {
  if (!hasDb()) return { connected: false };
  await ensureGmailSchema();
  const rows = await q<{ meta: any; updated_at: string }>(
    `SELECT meta, updated_at FROM admin_integrations WHERE id=$1`,
    [INTEGRATION_ID],
  );
  if (!rows.length) return { connected: false };
  const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
  return { connected: true, email: String(meta?.email || ''), updatedAt: rows[0].updated_at };
}

export async function storeGmailConnection(refreshToken: string, email: string, scope = GMAIL_SCOPE): Promise<void> {
  if (!refreshToken) throw new Error('missing_refresh_token');
  await ensureGmailSchema();
  const secret = encrypt({ refreshToken, email: email.toLowerCase(), scope });
  await q(
    `INSERT INTO admin_integrations (id, secret, meta) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET secret=$2, meta=$3, updated_at=now()`,
    [INTEGRATION_ID, secret, JSON.stringify({ email: email.toLowerCase(), scope })],
  );
}

export async function removeGmailConnection(): Promise<void> {
  if (!hasDb()) return;
  await ensureGmailSchema();
  await q(`DELETE FROM admin_integrations WHERE id=$1`, [INTEGRATION_ID]);
}

async function storedGmail(): Promise<StoredGmail> {
  await ensureGmailSchema();
  const rows = await q<{ secret: string }>(`SELECT secret FROM admin_integrations WHERE id=$1`, [INTEGRATION_ID]);
  if (!rows.length) throw new Error('gmail_not_connected');
  return decrypt(rows[0].secret);
}

async function accessToken(): Promise<{ token: string; email: string }> {
  const stored = await storedGmail();
  const { clientId, clientSecret } = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: stored.refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok || !data.access_token) {
    console.error('[gmail] refresh failed', response.status, String(data.error || '').slice(0, 100));
    throw new Error(data.error === 'invalid_grant' ? 'gmail_reconnect_required' : 'gmail_refresh_failed');
  }
  return { token: String(data.access_token), email: stored.email };
}

async function gmailFetchWithToken(token: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[gmail] api failed', response.status, path, JSON.stringify(data).slice(0, 200));
    throw new Error(response.status === 401 ? 'gmail_reconnect_required' : 'gmail_api_failed');
  }
  return data;
}

async function gmailFetch(path: string, init?: RequestInit): Promise<any> {
  const { token } = await accessToken();
  return gmailFetchWithToken(token, path, init);
}

function header(headers: any[], name: string): string {
  const found = (headers || []).find((item) => String(item?.name || '').toLowerCase() === name.toLowerCase());
  return String(found?.value || '');
}

function decodePart(data?: string): string {
  if (!data) return '';
  try { return Buffer.from(data, 'base64url').toString('utf8'); } catch { return ''; }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function bodyFromPayload(payload: any): string {
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (part: any) => {
    if (!part) return;
    const mime = String(part.mimeType || '').toLowerCase();
    const value = decodePart(part.body?.data);
    if (value && mime === 'text/plain') plain.push(value);
    else if (value && mime === 'text/html') html.push(value);
    for (const child of part.parts || []) walk(child);
  };
  walk(payload);
  const value = plain.join('\n\n').trim() || htmlToText(html.join('\n\n'));
  return value.slice(0, 20_000);
}

function parseMessage(message: any): GmailMessage {
  const headers = message.payload?.headers || [];
  return {
    id: String(message.id || ''),
    threadId: String(message.threadId || ''),
    from: header(headers, 'From'),
    to: header(headers, 'To'),
    subject: header(headers, 'Subject') || '(no subject)',
    date: header(headers, 'Date'),
    snippet: String(message.snippet || ''),
    body: bodyFromPayload(message.payload) || String(message.snippet || ''),
    unread: Array.isArray(message.labelIds) && message.labelIds.includes('UNREAD'),
    messageId: header(headers, 'Message-ID'),
    references: header(headers, 'References'),
  };
}

export async function listGmailMessages(query = 'in:inbox newer_than:30d', maxResults = 30): Promise<GmailMessage[]> {
  // Refresh once for the whole inbox operation. Reusing the short-lived access
  // token avoids one OAuth refresh request per message in the list.
  const { token } = await accessToken();
  const list = await gmailFetchWithToken(token, `/messages?maxResults=${Math.min(Math.max(maxResults, 1), 50)}&q=${encodeURIComponent(query)}`);
  const ids = Array.isArray(list.messages) ? list.messages.slice(0, maxResults) : [];
  const messages: GmailMessage[] = [];
  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const rows = await Promise.all(batch.map((item: any) => gmailFetchWithToken(token, `/messages/${encodeURIComponent(item.id)}?format=full`)));
    messages.push(...rows.map(parseMessage));
  }
  return messages;
}

function encodeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ id: string; threadId: string }> {
  const { token, email } = await accessToken();
  const headers = [
    `From: ${encodeHeader(email)}`,
    `To: ${encodeHeader(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${encodeHeader(input.inReplyTo)}`);
  if (input.references || input.inReplyTo) {
    headers.push(`References: ${encodeHeader([input.references, input.inReplyTo].filter(Boolean).join(' '))}`);
  }
  const raw = Buffer.from(`${headers.join('\r\n')}\r\n\r\n${input.body}`, 'utf8').toString('base64url');
  const result = await gmailFetchWithToken(token, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw, ...(input.threadId ? { threadId: input.threadId } : {}) }),
  });
  return { id: String(result.id || ''), threadId: String(result.threadId || input.threadId || '') };
}

export async function markGmailMessageRead(id: string): Promise<void> {
  await gmailFetch(`/messages/${encodeURIComponent(id)}/modify`, {
    method: 'POST',
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{ refreshToken: string; accessToken: string; scope: string }> {
  const { clientId, clientSecret } = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok || !data.access_token) {
    console.error('[gmail] code exchange failed', response.status, String(data.error || '').slice(0, 100));
    throw new Error('gmail_code_exchange_failed');
  }
  return {
    refreshToken: String(data.refresh_token || ''),
    accessToken: String(data.access_token),
    scope: String(data.scope || GMAIL_SCOPE),
  };
}

export async function gmailProfile(accessToken: string): Promise<{ email: string }> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok || !data.emailAddress) throw new Error('gmail_profile_failed');
  return { email: String(data.emailAddress).toLowerCase() };
}
