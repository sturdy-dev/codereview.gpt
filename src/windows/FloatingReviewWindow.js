import { BaseFloatingWindow } from './BaseFloatingWindow.js';
import { ApiClient } from '../api/ApiClient.js';
import { getConfig } from '../utils/config.js';
import { spinner, checkmark, xcircle } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import DOMPurify from 'dompurify';

const showdown = require('showdown');
const parsediff = require('parse-diff');

const converter = new showdown.Converter({
  tables: true,
  strikethrough: true,
  tasklists: true,
  ghCodeBlocks: true,
  smoothLivePreview: true,
  openLinksInNewWindow: true,
});

function renderMarkdown(text) {
  return DOMPurify.sanitize(converter.makeHtml(text));
}

export class FloatingReviewWindow extends BaseFloatingWindow {
  constructor() {
    super('codereview-floating-window', '');
    this.isReviewing = false; // Prevent duplicate reviews
    this._abortReviewStream = null;
    this.createWindow(768, 768);
    this.loadState();
  }

  createWindowContent() {
    return `
      <div class="codereview-window-header">
        <div class="codereview-window-title">codereview.luminary</div>
        <div class="codereview-window-controls">
          <button class="codereview-control-btn codereview-center-btn" title="Center window">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
          <button class="codereview-control-btn codereview-minimize-btn" title="Minimize">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <button class="codereview-control-btn codereview-close-btn" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="codereview-window-body">
        <div class="codereview-content">
          <div class="codereview-header-info">
            <div class="codereview-header-row">
              <button type="button" id="review-stop-btn" class="codereview-rerun-btn" style="display: none;" title="Остановить генерацию">
                Stop
              </button>
              <div id="rerun-btn" class="codereview-rerun-btn" style="display: none;">
                run again
              </div>
            </div>
            <div class="codereview-status-row">
              <span id="status-icon"></span>
              <span id="pr-url" class="codereview-pr-url"></span>
            </div>
          </div>
          <hr class="codereview-divider"/>
          <div class="codereview-result-container">
            <div id="result"></div>
          </div>
        </div>
      </div>
      <div class="codereview-resize-handle"></div>
    `;
  }

  attachEventListeners() {
    super.attachEventListeners();

    // Stop button
    const stopBtn = this.window.querySelector('#review-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this._abortReviewStream) {
          this._abortReviewStream();
        }
      });
    }

    const rerunBtn = this.window.querySelector('#rerun-btn');
    if (rerunBtn) {
      rerunBtn.addEventListener('click', async () => {
        const prUrl = window.location.href;
        const diffPath = this.getDiffPath(prUrl);

        if (diffPath) {
          await this.clearCache(diffPath);
        }

        this.runReview();
      });
    }
  }

  async clearCache(diffPath) {
    try {
      await chrome.storage.session.remove([diffPath]);
    } catch (e) {
      await chrome.runtime.sendMessage({ action: 'removeCache', key: diffPath }).catch(() => {});
    }
  }

  getDiffPath(url) {
    const tokens = url.split('/');

    if (tokens[2] === 'github.com' && tokens[5] === 'pull') {
      return `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.patch`;
    } else if (url.includes('/-/merge_requests/')) {
      const { origin, pathname } = new URL(url);
      return origin + pathname + '.diff';
    }

    return null;
  }

  setReviewStopVisible(visible) {
    const stopBtn = this.window?.querySelector('#review-stop-btn');
    if (stopBtn) {
      stopBtn.style.display = visible ? 'inline-block' : 'none';
    }
  }

  setStatus(ongoing, failed = false, rerun = true) {
    const statusIcon = this.window.querySelector('#status-icon');
    const rerunBtn = this.window.querySelector('#rerun-btn');

    if (ongoing) {
      statusIcon.innerHTML = spinner;
      rerunBtn.style.display = 'none';
      this.setReviewStopVisible(false);
    } else {
      statusIcon.innerHTML = failed ? xcircle : checkmark;
      if (rerun) {
        rerunBtn.style.display = 'block';
      }
      this.setReviewStopVisible(false);
    }
  }

  show() {
    super.show();
    // Only run review if window was just created or result is empty
    const resultDiv = this.window.querySelector('#result');
    if (!resultDiv.innerHTML.trim()) {
      this.runReview();
    }
  }

  async reviewPR(diffPath, context, title) {
    this.setStatus(true);
    const resultDiv = this.window.querySelector('#result');
    resultDiv.innerHTML = '';

    await this.clearCache(diffPath);

    let config;
    try {
      config = await getConfig();
    } catch (e) {
      logger.error('[CS] Failed to get config for prompts:', e);
      resultDiv.textContent = 'Error: Failed to load configuration. Please check extension settings.';
      this.setStatus(false, true, false);
      return;
    }

    let promptArray = [];
    let patch;

    // Fetch patch via background script to avoid CORS issues
    try {
      logger.log('[CS] Fetching patch from:', diffPath);
      const patchResponse = await chrome.runtime.sendMessage({
        action: 'fetchPatch',
        url: diffPath
      });

      if (!patchResponse || !patchResponse.success) {
        const errorMsg = patchResponse?.error || 'Unknown error';
        logger.error('[CS] Failed to fetch patch:', errorMsg);
        resultDiv.textContent = `Error: Failed to fetch patch file.\n\n${errorMsg}\n\nPlease check if the URL is correct: ${diffPath}`;
        this.setStatus(false, true, false);
        return;
      }

      patch = patchResponse.data;
      logger.log('[CS] Patch fetched successfully, length:', patch.length);
    } catch (error) {
      logger.error('[CS] Exception while fetching patch:', error);
      resultDiv.textContent = `Error: Failed to fetch patch file.\n\n${error.message}\n\nPlease check if the URL is correct: ${diffPath}`;
      this.setStatus(false, true, false);
      return;
    }

    let warning = '';
    let patchParts = [];

    const reviewPromptWithVars = config.reviewPrompt.replace(/{title}/g, title);
    promptArray.push(reviewPromptWithVars);

    promptArray.push(`A description to help you understand why these changes were made (markdown):

${context}

Do not respond yet. I will send the code changes in diff format next.`);

    // Remove binary patches
    const regex = /GIT\sbinary\spatch(.*)literal\s0/mgis;
    patch = patch.replace(regex, '');

    const files = parsediff(patch);

    files.forEach(function(file) {
      if (file.from.includes('lock.json')) {
        return;
      }

      const patchPartArray = [];

      patchPartArray.push('```diff');
      if ('from' in file && 'to' in file) {
        patchPartArray.push('diff --git a' + file.from + ' b'+ file.to);
      }
      if ('new' in file && file.new === true && 'newMode' in file) {
        patchPartArray.push('new file mode ' + file.newMode);
      }
      if ('from' in file) {
        patchPartArray.push('--- ' + file.from);
      }
      if ('to' in file) {
        patchPartArray.push('+++ ' + file.to);
      }
      if ('chunks' in file) {
        patchPartArray.push(file.chunks.map(c => c.changes.map(t => t.content).join('\n')));
      }
      patchPartArray.push('```');

      let patchPart = patchPartArray.join('\n');
      if (patchPart.length >= 15384) {
        patchPart = patchPart.slice(0, 15384);
        warning = 'Some parts of your patch were truncated as it was larger than 4096 tokens or 15384 characters. The review might not be as complete.';
      }
      patchParts.push(patchPart);
    });

    patchParts.forEach(part => {
      promptArray.push(part);
    });

    promptArray.push(config.finalPrompt);

    const systemMessage = { role: 'system', content: config.systemPrompt };
    const userMessages = promptArray.map(msg => ({ role: 'user', content: msg }));
    const apiMessages = [systemMessage, ...userMessages];

    logger.log('[CS] Sending review request with', apiMessages.length, 'messages');

    this._abortReviewStream = null;
    this.setReviewStopVisible(true);

    const { abort } = ApiClient.streamRequest(
      config,
      apiMessages,
      (answer) => {
        logger.log('[CS] Review answer length:', answer.length);
        resultDiv.innerHTML = renderMarkdown(answer + ' \n\n' + warning);
      },
      () => {
        logger.log('[CS] Review completed, final length:', resultDiv.textContent.length);
        this._abortReviewStream = null;
        this.setReviewStopVisible(false);
        chrome.storage.session.set({ [diffPath]: resultDiv.innerHTML })
          .catch(() => chrome.runtime.sendMessage({
            action: 'setCache',
            key: diffPath,
            value: resultDiv.innerHTML
          }))
          .catch(() => {});

        this.setStatus(false);
      },
      (error) => {
        logger.error('[CS] Review error:', error);
        this._abortReviewStream = null;
        this.setReviewStopVisible(false);
        resultDiv.innerHTML = renderMarkdown(error);
        this.setStatus(false, true, true);
      },
      (partial) => {
        this._abortReviewStream = null;
        this.setReviewStopVisible(false);
        const text = partial && partial.trim() ? partial : '';
        if (text) {
          resultDiv.innerHTML =
            renderMarkdown(text + ' \n\n' + warning) +
            '<p><em>Генерация остановлена.</em></p>';
        } else {
          resultDiv.innerHTML = '<p><em>Генерация остановлена.</em></p>';
        }
        this.setStatus(false, false, true);
      }
    );
    this._abortReviewStream = abort;
  }

  async runReview() {
    // Prevent duplicate reviews
    if (this.isReviewing) {
      logger.log('[FloatingReview] Review already in progress, ignoring duplicate call');
      return;
    }

    logger.log('[FloatingReview] Starting review...');
    this.isReviewing = true;

    try {
      const prUrl = this.window.querySelector('#pr-url');
      prUrl.textContent = window.location.href;

      let diffPath;
      let provider = '';
      let error = null;
      const tokens = window.location.href.split('/');
      let context = '';
      const title = document.title;

    // Detect provider
    const isGitLabMeta = document.querySelectorAll('meta[content="GitLab"]').length;

    if (tokens[2] === 'github.com') {
      provider = 'GitHub';
    } else if (isGitLabMeta === 1) {
      provider = 'GitLab';
    }

    if (provider === 'GitHub' && tokens[5] === 'pull') {
      diffPath = `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.patch`;

      const element = document.querySelector('.markdown-body');
      if (element) {
        context = element.textContent;
      }
    } else if (provider === 'GitLab' && window.location.href.includes('/-/merge_requests/')) {
      const { origin, pathname } = window.location;
      diffPath = origin + pathname + '.diff';

      const element = document.querySelector('.description textarea');
      if (element) {
        context = element.getAttribute('data-value') || '';
      }
    } else {
      if (provider) {
        error = 'Please open a specific Pull Request or Merge Request on ' + provider;
      } else {
        error = 'Only GitHub or GitLab (SaaS & self-hosted) are supported.';
      }
    }

      const resultDiv = this.window.querySelector('#result');

      if (error != null) {
        resultDiv.textContent = error;
        this.setStatus(false, true, false);
        return;
      }

      this.setStatus(true);

      // Check cache first
      await chrome.storage.session.get([diffPath])
        .then((result) => {
          if (result[diffPath]) {
            resultDiv.innerHTML = result[diffPath];
            this.setStatus(false);
          } else {
            // No cache in session, try background fallback
            return chrome.runtime.sendMessage({ action: 'getCache', key: diffPath })
              .then((bgResult) => {
                if (bgResult?.[diffPath]) {
                  resultDiv.innerHTML = bgResult[diffPath];
                  this.setStatus(false);
                } else {
                  // No cache at all, run review
                  return this.reviewPR(diffPath, context, title);
                }
              })
              .catch(() => {
                // Background cache failed, run review
                return this.reviewPR(diffPath, context, title);
              });
          }
        })
        .catch(() => {
          // Session storage failed, run review directly
          return this.reviewPR(diffPath, context, title);
        });
    } finally {
      this.isReviewing = false;
      logger.log('[FloatingReview] Review completed/finished');
    }
  }
}
