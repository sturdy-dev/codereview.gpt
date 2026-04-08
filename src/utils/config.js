import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_REVIEW_PROMPT,
  DEFAULT_FINAL_PROMPT,
  DEFAULT_EXPLAIN_PROMPT,
  EXPLAIN_DEFAULT_QUESTION,
  EXPLAIN_FOLLOW_UP_SYSTEM
} from './defaultPrompts.js';

// Configuration management
export async function getConfig() {
  let options;
  
  try {
    options = await new Promise((resolve) => {
      chrome.storage.sync.get([
        'openai_apikey', 
        'api_base_url', 
        'model',
        'api_timeout',
        'max_tokens',
        'temperature',
        'system_prompt',
        'review_prompt',
        'final_prompt',
        'explain_prompt',
        'debug_mode'
      ], resolve);
    });
  } catch (e) {
    options = await chrome.runtime.sendMessage({ action: 'getApiKey' });
  }
  
  const isLocalhost = options.api_base_url?.includes('localhost') || 
                     options.api_base_url?.includes('127.0.0.1');
  
  const apiKey = isLocalhost ? 'ollama' : options.openai_apikey;
  const baseUrl = options.api_base_url || 'https://api.openai.com/v1';
  const model = options.model || 'gpt-3.5-turbo';
  const apiTimeout = (options.api_timeout || 300) * 1000; // Convert seconds to milliseconds
  const maxTokens = parseInt(options.max_tokens) || 8192; // Default 8192 tokens for responses
  const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : 0.1; // Low temperature for deterministic code analysis
  
  const systemPrompt = options.system_prompt || DEFAULT_SYSTEM_PROMPT;
  const reviewPrompt = options.review_prompt || DEFAULT_REVIEW_PROMPT;
  const finalPrompt = options.final_prompt || DEFAULT_FINAL_PROMPT;
  const explainPrompt = options.explain_prompt || DEFAULT_EXPLAIN_PROMPT;
  const debugMode = options.debug_mode === true;
  
  if (!isLocalhost && !apiKey) {
    throw new Error('UNAUTHORIZED');
  }
  
  return {
    apiKey,
    baseUrl,
    model,
    apiTimeout,
    maxTokens,
    temperature,
    systemPrompt,
    reviewPrompt,
    finalPrompt,
    explainPrompt,
    explainDefaultQuestion: EXPLAIN_DEFAULT_QUESTION,
    explainFollowUpSystem: EXPLAIN_FOLLOW_UP_SYSTEM,
    debugMode
  };
}
