'use strict';

import './styles.css';
import { parse } from 'node-html-parser';

var parsediff = require('parse-diff');

const spinner = `
        <svg aria-hidden="true" class="w-4 h-4 text-gray-200 animate-spin dark:text-slate-200 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
`;
const checkmark = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-green-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`;
const xcircle = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-red-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`;

function inProgress(ongoing, failed = false, rerun = true) {
  if (ongoing) {
    document.getElementById('status-icon').innerHTML = spinner;
    document.getElementById('rerun-btn').classList.add('invisible');
  } else {
    if (failed) {
      document.getElementById('status-icon').innerHTML = xcircle;
    } else {
      document.getElementById('status-icon').innerHTML = checkmark;
    }
    if (rerun) {
      document.getElementById('rerun-btn').classList.remove('invisible');
    }
  }
}

async function getOllamaModel() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('ollama_model', resolve);
  });
  console.log(options);
  if (!options || !options['ollama_model']) {
    return '';
  }
  return options['ollama_model'];
}

async function getOllamaServer() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('ollama_server', resolve);
  });
  console.log(options);
  if (!options || !options['ollama_server']) {
    return 'http://localhost:11434';
  }
  return options['ollama_server'];
}

function getStorageKey(diffPath, model) {
  return `${diffPath}|${model}`;
}

function saveResult(diffPath, model, result) {
  const key = getStorageKey(diffPath, model);
  chrome.storage.session.set({ [key]: result });
}

async function callChatGPT(messages, callback, onDone) {
  let ollamaMessages = [
    {
      role: 'system',
      content:
        'I am a code change reviewer. I will provide feedback on the code changes given. Do not introduce yourselves. ',
    },
  ];

  for (const message of messages) {
    // append user message to ollamaMessages
    ollamaMessages.push({ role: 'user', content: message });
  }

  console.log('ollamaMessages', ollamaMessages);

  // Provide an alternative starting prompt
  var messageForCopy = `Based on the following information, please provide an improved title and description for the code change,'
    + 'and perform a thorough code review of the code changes.`;
  messages.forEach((message) => {
    if (messages.indexOf(message) !== 0 && messages.indexOf(message) !== messages.length - 1) {
      messageForCopy += `\n${message}`;
    }
  });
  console.log(messageForCopy);

  try {
    const model = document.getElementById('ollama_model').value;
    const ollamaServer = await getOllamaServer();
    console.log('ollama model', model);
    const response = await fetch(ollamaServer + '/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: ollamaMessages,
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = ''; // Accumulate the final response here
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        // Decode the chunk of data
        const chunk = decoder.decode(value, { stream: !done });

        // Parse and process the chunk
        chunk.split('\n').forEach((line) => {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              result = result + json.message.content;
              callback(result);
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }
        });
      }
    }
    console.log(result);
  } catch (e) {
    callback(String(e));
  }
  onDone();
}

const showdown = require('showdown');
const converter = new showdown.Converter();

async function reviewPR(diffPath, context, title) {
  console.log('reviewPR', diffPath, context, title);
  inProgress(true);
  document.getElementById('result').innerHTML = '';

  const selectedModel = document.getElementById('ollama_model').value;
  saveResult(diffPath, selectedModel, null);

  const maxProcessingLength = await getMaxProcessingLength(
    await getOllamaServer(),
    selectedModel
  );
  let promptArray = [];
  // Fetch the patch from our provider.
  let patch = await fetch(diffPath).then((r) => r.text());
  let warning = '';
  let patchParts = [];

  promptArray.push(`
    Your task is:
    - Review the code changes and provide feedback.
    - If you have a better version of the title and description of the merge request, please suggest in a dedicated section.
    - If there are any bugs, highlight them.
    - Provide details on missed use of best-practices.
    - Does the code do what it says in the commit messages?
    - Do not highlight minor issues and nitpicks.
    - Use bullet points if you have multiple comments.
    - Provide security recommendations if there are any.

    You are provided with the code changes (diffs) in a unidiff format.`);
  promptArray.push(`The change has the following title: ${title}`);
  if(context) {
    promptArray.push(`A description was given to help you assist in understand why these changes were made.
      The description was provided in a markdown format.
      ${context}`);
  }
  promptArray.push(`  You are provided with the code changes (diffs) in a unidiff format.`);

  // Remove binary files as those are not useful for ChatGPT to provide a review for.
  // TODO: Implement parse-diff library so that we can remove large lock files or binaries natively.
  const regex = /GIT\sbinary\spatch(.*)literal\s0/gims;
  patch = patch.replace(regex, '');

  var files = parsediff(patch);

  // Rebuild our patch as if it were different patches
  files.forEach(function (file) {
    // Ignore lockfiles
    if (file.from.includes('lock.json')) {
      return;
    }

    var patchPartArray = [];

    patchPartArray.push('```diff');
    if ('from' in file && 'to' in file) {
      patchPartArray.push('diff --git a' + file.from + ' b' + file.to);
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
      patchPartArray.push(
        file.chunks.map((c) => c.changes.map((t) => t.content).join('\n'))
      );
    }
    patchPartArray.push('```');

    var patchPart = patchPartArray.join('\n');
    if (patchPart.length >= maxProcessingLength) {
      patchPart = patchPart.slice(0, maxProcessingLength);
      warning =
        'Some parts of your patch were truncated as it was larger than ' +
        maxProcessingLength +
        ' characters. The review might not be as complete.';
    }
    patchParts.push(patchPart);
  });

  patchParts.forEach((part) => {
    promptArray.push(part);
  });

  // Send our prompts to ChatGPT.
  callChatGPT(
    promptArray,
    (answer) => {
      document.getElementById('result').innerHTML = converter.makeHtml(
        answer + ' \n\n' + warning
      );
    },
    () => {
      const result = document.getElementById('result').innerHTML;
      saveResult(diffPath, selectedModel, result);
      inProgress(false);
    }
  );
}

async function fetchOllamaModels(server) {
  try {
    const response = await fetch(`${server}/api/tags`);
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    document.getElementById('result').innerHTML =
      'Error fetching Ollama models:' + error;
    return [];
  }
}

async function getMaxProcessingLength(server, model) {
  try {
    const response = await fetch(`${server}/api/show`, {
      method: 'POST',
      body: JSON.stringify({
        model: model,
      }),
    });
    const jsonResponse = await response.json();
    console.log('context length query response: ', jsonResponse);
    const modelInfo = jsonResponse['model_info'];
    // Search if there is a field containing context_length as a substring
    for (const key in modelInfo) {
      if (key.endsWith('.context_length')) {
        // We will use the guidance of 1 token ~= 4 chars in English, minus 1000 chars to be sure.
        const maxProcessingLength = modelInfo[key] * 4 - 1000;
        console.log(
          'model token size',
          key,
          ': ',
          modelInfo[key],
          ', maxProcessingLength: ',
          maxProcessingLength
        );
        return maxProcessingLength;
      }
    }
  } catch (error) {
    document.getElementById('result').innerHTML =
      'Error fetching context length:' + error;
  }
  return 4096 * 4 - 1000; // Assuming default 4096 tokens
}

async function populateModelDropdown() {
  const modelSelect = document.getElementById('ollama_model');
  const server = await getOllamaServer();
  const models = await fetchOllamaModels(server);

  modelSelect.innerHTML = '';
  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = model.name;
    modelSelect.appendChild(option);
  });

  if (models.length > 0) {
    // Set the current model using the stored value
    const currentModel = await getOllamaModel();
    console.log('currentModel: ', currentModel);
    modelSelect.value = currentModel ? currentModel : models[0].name;
    return true;
  } else {
    document.getElementById('result').innerHTML = 'Ollama model not found';
    return false;
  }
}

function getCodeReviewFromCacheOrLLM(diffPath, context, title) {
  const selectedModel = document.getElementById('ollama_model').value;
  const storageKey = getStorageKey(diffPath, selectedModel);
  chrome.storage.session.get([storageKey]).then(async (result) => {
    if (result[storageKey]) {
      document.getElementById('result').innerHTML = result[storageKey];
      inProgress(false);
    } else {
      reviewPR(diffPath, context, title);
    }
  });
}

async function run() {
  // Get current tab
  let tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let prUrl = document.getElementById('pr-url');
  prUrl.textContent = tab.url;

  const success = await populateModelDropdown();

  if (!success) {
    return;
  }

  let diffPath;
  let provider = '';
  let error = null;
  let tokens = tab.url.split('/');
  let context = '';
  let title = tab.title;

  // Simple verification if it would be a self-hosted GitLab instance.
  // We verify if there is a meta tag present with the content "GitLab".
  let isGitLabResult = (
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        return document.querySelectorAll('meta[content="GitLab"]').length;
      },
    })
  )[0];

  if (tokens[2] === 'github.com') {
    provider = 'GitHub';
  } else if ('result' in isGitLabResult && isGitLabResult.result == 1) {
    provider = 'GitLab';
  }

  if (provider === 'GitHub' && tokens[5] === 'pull') {
    // The path towards the patch file of this change
    diffPath = `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.diff`;
    // The description of the author of the change
    // Fetch it by running a querySelector script specific to GitHub on the active tab
    const contextExternalResult = (
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          return document.querySelector('.markdown-body').textContent;
        },
      })
    )[0];

    if ('result' in contextExternalResult) {
      context = contextExternalResult.result;
    }
  } else if (provider === 'GitLab' && tab.url.includes('/-/merge_requests/')) {
    // strip the part after /-/merge_requests/[number]
    const pattern = /\/merge_requests\/\d+/;

    // Find the pattern in the URL
    const match = tab.url.match(pattern);

    // If the pattern is found, strip the part after it
    const strippedUrl = match
      ? tab.url.slice(0, match.index + match[0].length)
      : tab.url;

    // The path towards the patch file of this change
    diffPath = strippedUrl + '.diff';
    // The description of the author of the change
    // Fetch it by running a querySelector script specific to GitLab on the active tab
    const contextExternalResult = (
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          return document
            .querySelector('.description textarea')
            .getAttribute('data-value');
        },
      })
    )[0];

    if ('result' in contextExternalResult) {
      context = contextExternalResult.result;
    }
  } else {
    if (provider) {
      error =
        'Please open a specific Pull Request or Merge Request on ' + provider;
    } else {
      error = 'Only GitHub or GitLab (SaaS & self-hosted) are supported.';
    }
  }

  if (error != null) {
    document.getElementById('result').innerHTML = error;
    inProgress(false, true, false);
    await new Promise((r) => setTimeout(r, 4000));
    window.close();
    return; // not a pr
  }

  inProgress(true);

  // Handle rerun button. Ingore caching and just run the LLM query again
  document.getElementById('rerun-btn').onclick = () => {
    reviewPR(diffPath, context, title);
  };

  // Hanlde model switches
  document
    .getElementById('ollama_model')
    .addEventListener('change', (event) => {
      getCodeReviewFromCacheOrLLM(diffPath, context, title);
      // Update the cached model so that it's used for the future run of the extension
      chrome.storage.sync.set({ ollama_model: event.target.value });
    });

  getCodeReviewFromCacheOrLLM(diffPath, context, title);
}

run();
