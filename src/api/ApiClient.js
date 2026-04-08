import { logger } from '../utils/logger.js';

/**
 * API Client for streaming requests via Chrome Runtime Ports
 */
export class ApiClient {
  /**
   * Call ChatGPT API with streaming support
   * @param {Object} config - API configuration (apiKey, baseUrl, model, apiTimeout)
   * @param {Array} messages - Array of message objects with role and content
   * @param {Function} onChunk - Callback for each chunk (receives accumulated response)
   * @param {Function} onDone - Callback when done
   * @param {Function} onError - Callback on error
   * @param {Function} [onAbort] - Callback when user stops generation (receives accumulated text)
   * @returns {{ abort: () => void }}
   */
  static streamRequest(config, messages, onChunk, onDone, onError, onAbort) {
    const requestBody = {
      model: config.model,
      messages: messages,
      stream: true,
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature !== undefined ? config.temperature : 0.1,
      top_p: 1.0
    };

    const url = `${config.baseUrl}/chat/completions`;
    const timeoutMs = config.apiTimeout || 300000; // Default 5 minutes
    logger.log('[CS] Starting streaming request to:', url, `timeout: ${timeoutMs}ms`);
    logger.log('[CS] Request body:', requestBody);
    logger.log('[CS] Messages summary:', messages.map(m => ({ role: m.role, length: m.content.length })));

    const port = chrome.runtime.connect({ name: 'streaming-api' });
    let fullResponse = '';
    let chunkCount = 0;
    let isCompleted = false;
    // Tracks that the user pressed Stop and we're waiting for background confirmation.
    // While true: ignore incoming chunks (no UI flicker), treat 'done' as 'aborted'.
    let isAborting = false;

    const abort = () => {
      if (isCompleted || isAborting) return;
      isAborting = true;
      logger.log('[CS] abort() called, sending abortStream to background');
      try {
        port.postMessage({ action: 'abortStream' });
      } catch (e) {
        logger.warn('[CS] abortStream failed:', e);
      }
    };

    // Timeout handler — fires onError, not onAbort (user didn't request this)
    const timeout = setTimeout(() => {
      if (!isCompleted && !isAborting) {
        logger.error(`[CS] Streaming timeout after ${timeoutMs}ms`);
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        const errorMsg = fullResponse || 'Error: Request timeout. The API took too long to respond.';
        if (onError) onError(errorMsg);
      }
    }, timeoutMs);

    logger.log('[CS] Sending request with', messages.length, 'messages');

    port.postMessage({
      action: 'streamRequest',
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    port.onMessage.addListener((msg) => {
      logger.log('[CS] Received message type:', msg.type);

      if (msg.type === 'chunk') {
        // Silently discard chunks that arrive after the user pressed Stop.
        // Background might still be draining its buffer or have messages in-flight.
        if (isAborting) return;

        chunkCount++;
        fullResponse += msg.content;
        if (onChunk) onChunk(fullResponse);

        if (chunkCount === 1) {
          logger.log('[CS] First chunk received, streaming started');
        }
        if (chunkCount % 10 === 0) {
          logger.log(`[CS] Received ${chunkCount} chunks, length: ${fullResponse.length}`);
        }
      } else if (msg.type === 'done') {
        logger.log(`[CS] Stream completed, total chunks: ${chunkCount}, response length: ${fullResponse.length}`);
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        // Race condition: background sent 'done' before it could process 'abortStream'.
        // Treat it as a user-requested abort so the UI reflects the Stop action.
        if (isAborting) {
          logger.log('[CS] done received while aborting — treating as aborted');
          if (onAbort) onAbort(fullResponse);
        } else {
          if (onDone) onDone();
        }
      } else if (msg.type === 'aborted') {
        logger.log('[CS] Stream aborted by user, length:', fullResponse.length);
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        if (onAbort) onAbort(fullResponse);
      } else if (msg.type === 'error') {
        logger.error('[CS] Stream error:', msg.error);
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();

        let errorMessage = `Error: ${msg.error}`;
        errorMessage += '\n\nTroubleshooting:\n';
        errorMessage += '- Check browser console (F12) for details\n';
        errorMessage += '- Verify your API key and settings\n';
        errorMessage += `- API URL: ${config.baseUrl}\n`;

        if (onError) onError(errorMessage);
      }
    });

    port.onDisconnect.addListener(() => {
      logger.log('[CS] Port disconnected, completed:', isCompleted, 'chunks:', chunkCount);

      if (!isCompleted) {
        logger.warn('[CS] Port disconnected before completion!');
        clearTimeout(timeout);

        const errorMsg = fullResponse
          ? fullResponse + '\n\n[Warning: Connection lost, showing partial response]'
          : 'Error: Connection lost before receiving any data. Check background script console.';

        if (onError) onError(errorMsg);
      }
    });

    return { abort };
  }
}
