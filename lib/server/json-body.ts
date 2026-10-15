export type JsonObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 | 408; error: 'invalid_request' | 'body_too_large' | 'request_timeout' };

// Enforce the actual streamed byte budget, not just a client-supplied length.
// Narrow credential routes use 8 KiB; uploads need their own larger contracts.
export async function readJsonObject(req: Request, maxBytes = 8192, timeoutMs = 5000): Promise<JsonObjectResult> {
  const declared = req.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))) return { ok: false, status: 400, error: 'invalid_request' };
  if (declared !== null && Number(declared) > maxBytes) return { ok: false, status: 413, error: 'body_too_large' };
  if (!req.body) return { ok: false, status: 400, error: 'invalid_request' };
  const reader = req.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('json_body_timeout')), timeoutMs);
  });
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    let text = '';
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) return { ok: false, status: 413, error: 'body_too_large' };
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, status: 400, error: 'invalid_request' };
    return { ok: true, value: value as Record<string, unknown> };
  } catch (error) {
    return error instanceof Error && error.message === 'json_body_timeout'
      ? { ok: false, status: 408, error: 'request_timeout' }
      : { ok: false, status: 400, error: 'invalid_request' };
  } finally {
    clearTimeout(timer);
    // Do not wait indefinitely for a slow client's cancellation acknowledgement.
    void reader.cancel().catch(() => {});
  }
}
