'use strict';

import './styles.css';
import { parse } from 'node-html-parser';
import { ChatGPTAPI } from 'chatgpt';

var parsediff = require('parse-diff');

const spinner = `
        <svg aria-hidden="true" class="w-4 h-4 text-gray-200 animate-spin dark:text-slate-200 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
`
const checkmark = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-green-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`
const xcircle = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-red-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`

function inProgress(ongoing, failed = false, rerun = true) {
  if (ongoing) {
    document.getElementById('status-icon').innerHTML = spinner
    document.getElementById('rerun-btn').classList.add("invisible");
    document.getElementById('codeball-link').classList.add("invisible");
  } else {
    if (failed) {
      document.getElementById('status-icon').innerHTML = xcircle
    } else {
      document.getElementById('status-icon').innerHTML = checkmark
    }
    if (rerun) {
      document.getElementById('rerun-btn').classList.remove("invisible");
      document.getElementById('codeball-link').classList.remove("invisible");
    }
  }
}

async function getApiKey() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('openai_apikey', resolve);
  });
  if (!options && !options['openai_apikey']) {
    throw new Error("UNAUTHORIZED");
  }
  return options['openai_apikey'];
}

async function callChatGPT(messages, callback, onDone) {
  let apiKey;
  try {
    apiKey = await getApiKey();
  } catch (e) {
    callback('Please add your Open AI API key to the settings of this Chrome Extension.');
  }

  const api = new ChatGPTAPI({
    apiKey: apiKey,
    systemMessage: `You are a programming code change reviewer, provide feedback on the code changes given. Do not introduce yourselves.`
  })

  let res
  let iterations = messages.length;
  for (const message of messages) {
    iterations--;
    try {
      // Last prompt
      var options = {};
      // If we have no iterations left, it means its the last of our prompt messages.
      if (iterations == 0) {
        options = {
          onProgress: (partialResponse) => callback(partialResponse.text),
        }
      }
      // In progress
      else {
        options = {
          onProgress: () => callback("Processing your code changes. Number of prompts left to send: " + iterations + ". Stay tuned..."),
        }
      }

      if (res) {
        options.parentMessageId = res.id
      }
      res = await api.sendMessage(message, options)
    } catch (e){
      callback(String(e));
      onDone();
      return;
    }
  };

  onDone();
}

const showdown = require('showdown');
const converter = new showdown.Converter()

async function reviewPR(diffPath, context, title) {
  inProgress(true)
  document.getElementById('result').innerHTML = ''
  chrome.storage.session.remove([diffPath])


  let promptArray = [];
  // Fetch the patch from our provider.
  let patch = await fetch (diffPath).then((r) => r.text())
  let warning = '';
  let patchParts = [];

  promptArray.push(`The change has the following title: ${title}.

    Your task is:
    - Review the code changes and provide feedback.
    - If there are any bugs, highlight them.
    - Provide details on missed use of best-practices.
    - Does the code do what it says in the commit messages?
    - Do not highlight minor issues and nitpicks.
    - Use bullet points if you have multiple comments.
    - Provide security recommendations if there are any.

    You are provided with the code changes (diffs) in a unidiff format.
    Do not provide feedback yet. I will follow-up with a description of the change in a new message.`
  );

  promptArray.push(`A description was given to help you assist in understand why these changes were made.
    The description was provided in a markdown format. Do not provide feedback yet. I will follow-up with the code changes in diff format in a new message.

    ${context}`);

  // Remove binary files as those are not useful for ChatGPT to provide a review for.
  // TODO: Implement parse-diff library so that we can remove large lock files or binaries natively.
  const regex = /GIT\sbinary\spatch(.*)literal\s0/mgis;
  patch = patch.replace(regex,'')

  // Separate the patch in different pieces to give ChatGPT more context.
  // Additionally, truncate the part of the patch if it is too big for ChatGPT to handle.
  // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
  // ChatGPT 3.5 has a maximum token size of 4096 tokens https://platform.openai.com/docs/models/gpt-3-5
  // We will use the guidance of 1 token ~= 4 chars in English, minus 1000 chars to be sure.
  // This means we have 16384, and let's reduce 1000 chars from that.
  var files = parsediff(patch);

  files.forEach(function(file) {
    // Ignore lockfiles
    if (file.from.includes("lock.json")) {
      return;
    }
    var patchPartArray = [];
    // Rebuild our patch as if it were different patches
    patchPartArray.push("```diff");
    patchPartArray.push("diff --git a" + file.from + " b"+ file.to);
    if (file.new === true) {
      patchPartArray.push("new file mode " + file.newMode);
    }
    patchPartArray.push("index " + file.index[0] + " " + file.index[1]);
    patchPartArray.push("--- " + file.from);
    patchPartArray.push("+++ " + file.to);
    patchPartArray.push(file.chunks.map(c => c.changes.map(t => t.content).join("\n")));
    patchPartArray.push("```");
    patchPartArray.push("\nDo not provide feedback yet. I will confirm once all code changes were submitted.");

    var patchPart = patchPartArray.join("\n");
    if (patchPart.length >= 15384) {
      patchPart = patchPart.slice(0, 15384)
      warning = 'Some parts of your patch were truncated as it was larger than 4096 tokens or 15384 characters. The review might not be as complete.'
    }
    patchParts.push(patchPart);
  });

  patchParts.forEach(part => {
    promptArray.push(part);
  });

  promptArray.push("All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided");

  // Send our prompts to ChatGPT.
  callChatGPT(
    promptArray,
    (answer) => {
      document.getElementById('result').innerHTML = converter.makeHtml(answer + " \n\n" + warning)
    },
    () => {
      chrome.storage.session.set({ [diffPath]: document.getElementById('result').innerHTML })
      inProgress(false)
    }
  )
}

async function run() {

  let tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let prUrl = document.getElementById('pr-url')
  prUrl.textContent = tab.url

  let diffPath
  let provider = ''
  let error = null
  let tokens = tab.url.split('/')
  let context = ''
  let title = tab.title

  if (tokens[2] === 'github.com') {
    provider = 'GitHub'
  }
  else if (tokens[2] === 'gitlab.com') {
    provider = 'GitLab'
  }
  else {
    error = 'Only github.com or gitlab.com are supported.'
  }

  let contextRaw = await fetch (tab.url).then((r) => r.text())
  const contextDom = parse(contextRaw);

  if (provider === 'GitHub' && tokens[5] === 'pull') {
    // The path towards the patch file of this change
    diffPath = `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.patch`;
    // The description of the author of the change
    context = contextDom.querySelector('.markdown-body').textContent;
  }
  else if (provider === 'GitLab' && tab.url.includes('/-/merge_requests/')) {
    // The path towards the patch file of this change
    diffPath = tab.url + '.patch';
    // The description of the author of the change
    context = contextDom.querySelector('.description textarea').getAttribute('data-value');
  }
  else {
    error = 'Please open a specific Pull Request or Merge Request on ' + provider
  }
 
  if (error != null) {
    document.getElementById('result').innerHTML = error
    inProgress(false, true, false);
    await new Promise((r) => setTimeout(r, 4000));
    window.close();
    return // not a pr
  }

  inProgress(true)

  document.getElementById("rerun-btn").onclick = () => {
    reviewPR(diffPath, context, title)
  }

  chrome.storage.session.get([diffPath]).then((result) => {
    if (result[diffPath]) {
      document.getElementById('result').innerHTML = result[diffPath]
      inProgress(false)
    } else {
      reviewPR(diffPath, context, title)
    }
  })
}

run();
