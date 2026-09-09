import { fetchEventSource } from '@microsoft/fetch-event-source';
import { refresh } from './auth';

class SSEManager {
  constructor() {
    this.abortController = null;
  }

  async connect({ threadId, email, onMessage, onError, onDone }) {
    // Close any existing connection
    this.close();

    const url = `${process.env.NEXT_PUBLIC_API_SERVER_URL}/thread/stream?t_id=${threadId}&e=${email}`;

    this.abortController = new AbortController();

    try {
      await fetchEventSource(url, {
        method: 'GET',
        credentials: 'include',
        signal: this.abortController.signal,
        openWhenHidden: true,

        async onopen(response) {
          console.log('OPEN', response.status);

          if (response.ok) {
            return;
          }

          if (
            response.status === 401 &&
            response.headers.get('content-type')?.includes('application/json')
          ) {
            const data = await response.json();

            if (data?.error === 'TOKEN_EXPIRED' && data?.type === 'access') {
              await refresh();

              // Throw so we reconnect below
              throw new Error('TOKEN_EXPIRED');
            }
          }

          throw new Error(`Failed to connect. Status: ${response.status}`);
        },

        onmessage(event) {
          const raw = event.data?.trim();

          if (raw === '[DONE]') {
            console.log('SSE stream finished');
            onDone?.();
            return;
          }

          try {
            const data = JSON.parse(raw);
            console.log('[DATA]: ', data);

            onMessage?.(data);
          } catch (err) {
            if (raw !== 'stream_start') {
              console.error('SSE parse error', err);
            }
          }
        },

        onclose() {
          console.log('SSE connection closed');
        },

        onerror(err) {
          // Re-throw so fetchEventSource exits
          throw err;
        },
      });
    } catch (err) {
      // Ignore manual close
      if (err.name === 'AbortError') {
        return;
      }

      // Token refreshed successfully → reconnect
      if (err.message === 'TOKEN_EXPIRED') {
        return this.connect({
          threadId,
          email,
          onMessage,
          onError,
          onDone,
        });
      }

      console.error('SSE error', err);
      onError?.(err);
    }
  }

  close() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const sseManager = new SSEManager();
