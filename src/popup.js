'use strict';

import { createParser } from "eventsource-parser";
import './styles.css';
import { parse } from 'node-html-parser';

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

async function getAccessToken() {
  const resp = await fetch("https://chat.openai.com/api/auth/session")
    .then((r) => r.json())
    .catch(() => ({}));
  if (!resp.accessToken) {
    throw new Error("UNAUTHORIZED");
  }
  return resp.accessToken;
}

async function* streamAsyncIterable(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}


async function fetchSSE(resource, options) {
  const { onMessage, ...fetchOptions } = options;
  const resp = await fetch(resource, fetchOptions);
  if (resp.status > 399) {
    resp.json().then((r) => {
      inProgress(false, true)
      onMessage(
        JSON.stringify({ 'message': { 'content': { 'parts': [r.detail] } } }));
    })
    return
  }
  const parser = createParser((event) => {
    if (event.type === "event") {
      onMessage(event.data);
    }
  });
  for await (const chunk of streamAsyncIterable(resp.body)) {
    const str = new TextDecoder().decode(chunk);
    parser.feed(str);
  }
}


async function callChatGPT(question, callback, onDone) {
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    callback('Please login at <a href="https://chat.openai.com" target="_blank" class="hover:text-slate-800">chat.openai.com</a> first.');
  }
  await fetchSSE("https://chat.openai.com/backend-api/conversation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "next",
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: {
            content_type: "text",
            parts: [question],
          },
        },
      ],
      model: "text-davinci-002-render",
      parent_message_id: crypto.randomUUID(),
    }),
    onMessage(message) {
      console.debug("sse message", message);
      if (message === "[DONE]") {
        onDone();
        return;
      }
      try {
        const data = JSON.parse(message);
        const text = data.message?.content?.parts?.[0];
        if (text) {
          callback(text);
        }
      } catch (e) {
        // Sometimes the API returns a datetime string, which causes the JSON parsing
        // to fail in the middle of the output.
        console.debug(e.message);
      }
    }
  });
}
const showdown = require('showdown');
const converter = new showdown.Converter()

async function reviewPR(diffPath, context, title) {
  inProgress(true)
  document.getElementById('result').innerHTML = ''
  chrome.storage.session.remove([diffPath])

  let patch = await fetch (diffPath).then((r) => r.text())

  let prompt = `
  Act as a code reviewer of a Pull Request, providing feedback on the code changes below. Do not introduce yourselves.
  The change has the following title: ${title}.
  As a code reviewer, your task is:
  - Review the code changes (diffs) in the patch and provide feedback.
  - If there are any bugs, highlight them.
  - Does the code do what it says in the commit messages?
  - Do not highlight minor issues and nitpicks.
  - Use bullet points if you have multiple comments.
  - Be as concise as possible
  - Assume positive intent

  You are provided with the code changes in a patch format.
  Each patch entry has the commit message in the Subject line followed by the code changes (diffs) in a unidiff format.

  \n\n
  Patch of the code change to review:
  \n
  ${patch}
  \n\n

  Additionally, a description was given to help you assist in understanding why these changes were made.
  \n
  \n
  Description of the code change to review in a markdown format:
  \n
  ${context}
  \n`

  callChatGPT(
    prompt,
    (answer) => {
      document.getElementById('result').innerHTML = converter.makeHtml(answer)
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
