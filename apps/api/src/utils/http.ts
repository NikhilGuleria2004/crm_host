const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export async function safeFetch(url: string, init?: RequestInit, options?: { timeoutMs?: number; maxBytes?: number }): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = (init?.signal ?? undefined) as AbortSignal | undefined;

  try {
    const response = await fetch(url, {
      ...init,
      signal: signal ? combineSignals(signal, controller.signal) : controller.signal,
    });

    if (!response.ok) {
      return response;
    }

    if (response.body) {
      const reader = response.body.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        received += value.length;
        if (received > maxBytes) {
          reader.cancel();
          return new Response(
            JSON.stringify({ error: { code: 'RESPONSE_TOO_LARGE', message: `Response body exceeds maximum allowed size of ${maxBytes / 1024 / 1024} MB` } }),
            { status: 413, headers: { 'Content-Type': 'application/json' } }
          );
        }

        chunks.push(value);
      }

      const blob = new Blob(chunks);
      const patched = new Response(blob, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      return patched;
    }

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: { code: 'REQUEST_TIMEOUT', message: `Request timed out after ${timeoutMs}ms` } }),
        { status: 408, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });

  if (a.aborted || b.aborted) {
    controller.abort();
  }

  return controller.signal;
}
