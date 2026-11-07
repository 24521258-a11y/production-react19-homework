
/*
 * HW3 - Simulated Airdrop API
 * Success and HTTP 409 conflict scenarios.
 * No real network requests are made.
 */

function abortError() {
  return new DOMException(
    'Request cancelled',
    'AbortError'
  );
}

export function simulateAirdropRequest({
  action,
  outcome = 'success',
  signal,
}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    let timeoutId;

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(abortError());
    };

    signal?.addEventListener('abort', onAbort, {
      once: true,
    });

    timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);

      if (outcome === 'conflict') {
        const error = new Error(
          '409 Conflict: request rejected by server.'
        );

        error.status = 409;
        reject(error);
        return;
      }

      resolve({
        ok: true,
        status: 200,
        action,
        confirmedAt: Date.now(),
      });
    }, 1500);
  });
}
