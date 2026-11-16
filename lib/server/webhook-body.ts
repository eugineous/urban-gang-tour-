type WebhookBodyResult =
  | {ok: true; body: Buffer}
  | {ok: false; status: 400 | 408 | 413; error: string};

// Keep original bytes for provider signatures. Never fully buffer an
// untrusted request before checking its actual byte budget and read deadline.
export async function readWebhookBody(req: Request, maxBytes = 1024 * 1024, timeoutMs = 5000): Promise<WebhookBodyResult> {
  const declared = req.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared))))
    return {ok: false, status: 400, error: 'invalid_size'};
  if (declared !== null && Number(declared) > maxBytes)
    return {ok: false, status: 413, error: 'body_too_large'};
  if (!req.body) return {ok: true, body: Buffer.alloc(0)};
  const reader = req.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('webhook_body_timeout')), timeoutMs);
  });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const {done, value} = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) return {ok: false, status: 413, error: 'body_too_large'};
      chunks.push(value);
    }
    return {ok: true, body: Buffer.concat(chunks, size)};
  } catch (error) {
    return error instanceof Error && error.message === 'webhook_body_timeout'
      ? {ok: false, status: 408, error: 'request_timeout'}
      : {ok: false, status: 400, error: 'invalid_body'};
  } finally {
    clearTimeout(timer);
    // Cancellation must not wait on an unresponsive sender.
    void reader.cancel().catch(() => {});
  }
}
