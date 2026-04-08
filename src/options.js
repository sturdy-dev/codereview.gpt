import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_REVIEW_PROMPT,
  DEFAULT_FINAL_PROMPT,
  DEFAULT_EXPLAIN_PROMPT
} from './utils/defaultPrompts.js';

// Saves options to chrome.storage
const saveOptions = () => {
    const openai_apikey = document.getElementById('openai_apikey').value;
    const api_base_url = document.getElementById('api_base_url').value.trim();
    const model = document.getElementById('model').value.trim();
    const api_timeout = document.getElementById('api_timeout').value.trim();
    const max_tokens = document.getElementById('max_tokens').value.trim();
    const temperature = document.getElementById('temperature').value.trim();
    const system_prompt = document.getElementById('system_prompt').value.trim();
    const review_prompt = document.getElementById('review_prompt').value.trim();
    const final_prompt = document.getElementById('final_prompt').value.trim();
    const explain_prompt = document.getElementById('explain_prompt').value.trim();
    const debug_mode = document.getElementById('debug_mode').checked;

    // Save to chrome.storage.sync
    chrome.storage.sync.set(
      {
        openai_apikey: openai_apikey,
        api_base_url: api_base_url || undefined,
        model: model || undefined,
        api_timeout: api_timeout ? parseInt(api_timeout) : undefined,
        max_tokens: max_tokens ? parseInt(max_tokens) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        system_prompt: system_prompt || undefined,
        review_prompt: review_prompt || undefined,
        final_prompt: final_prompt || undefined,
        explain_prompt: explain_prompt || undefined,
        debug_mode: debug_mode
      },
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  };

  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      {
        openai_apikey: '',
        api_base_url: '',
        model: '',
        api_timeout: 300,
        max_tokens: 8192,
        temperature: 0.1,
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        review_prompt: DEFAULT_REVIEW_PROMPT,
        final_prompt: DEFAULT_FINAL_PROMPT,
        explain_prompt: DEFAULT_EXPLAIN_PROMPT,
        debug_mode: false
      },
      (items) => {
        document.getElementById('openai_apikey').value = items.openai_apikey;
        document.getElementById('api_base_url').value = items.api_base_url || '';
        document.getElementById('model').value = items.model || '';
        document.getElementById('api_timeout').value = items.api_timeout || 300;
        document.getElementById('max_tokens').value = items.max_tokens || 8192;
        document.getElementById('temperature').value = items.temperature !== undefined ? items.temperature : 0.1;
        document.getElementById('system_prompt').value = items.system_prompt || DEFAULT_SYSTEM_PROMPT;
        document.getElementById('review_prompt').value = items.review_prompt || DEFAULT_REVIEW_PROMPT;
        document.getElementById('final_prompt').value = items.final_prompt || DEFAULT_FINAL_PROMPT;
        document.getElementById('explain_prompt').value = items.explain_prompt || DEFAULT_EXPLAIN_PROMPT;
        document.getElementById('debug_mode').checked = items.debug_mode === true;
      }
    );
  };

  // Reset prompts to default values
  const resetPrompts = () => {
    document.getElementById('system_prompt').value = DEFAULT_SYSTEM_PROMPT;
    document.getElementById('review_prompt').value = DEFAULT_REVIEW_PROMPT;
    document.getElementById('final_prompt').value = DEFAULT_FINAL_PROMPT;
    document.getElementById('explain_prompt').value = DEFAULT_EXPLAIN_PROMPT;

    const status = document.getElementById('status');
    status.textContent = 'Prompts reset to default. Click Save to apply.';
    status.style.color = 'orange';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = 'green';
    }, 2000);
  };

  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('reset').addEventListener('click', resetPrompts);
