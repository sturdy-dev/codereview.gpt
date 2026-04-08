# codereview.gpt

Chrome extension that reviews Pull Requests using ChatGPT and provides AI-powered code explanations.

## Features

### Code Review

Automatically reviews GitHub PRs and GitLab MRs with AI-generated feedback.

**[SCREENSHOT: Review window showing code feedback]**

How to use:
- Open any GitHub PR or GitLab MR
- Click the extension icon
- Get instant AI review with streaming response

The extension analyzes commit messages, code changes (in patch format), and PR description to provide relevant feedback.

### AI Chat for Code Explanation

Chat-style interface for understanding any code you encounter.

**[SCREENSHOT: Chat window with selected code context]**

How to use:
- Select text on any webpage (code, errors, docs)
- Right-click → "Объяснить с помощью AI"
- Ask questions in the chat or hit send for general explanation
- Get follow-up clarifications in the same conversation

The selected code stays as context throughout the conversation. Each new selection starts a fresh chat.

## Configuration

Access settings via extension icon → Options (opens in new tab).

**[SCREENSHOT: Options page showing all settings]**

Available parameters:
- **API Key** - Your OpenAI or compatible API key
- **Base URL** - Custom API endpoint (default: OpenAI)
- **Model** - Which model to use (gpt-4, claude, etc.)
- **Max Tokens** - Response length limit (default: 8192)
  - Lower values: shorter responses, better reliability
  - Higher values: longer responses, may cause errors with some providers
  - Recommended: 4096-8192 for most use cases
- **Temperature** - Creativity level (0.0-2.0, default: 0.1)
  - 0.0: Focused and deterministic
  - 1.0: More creative and varied
- **Prompts** - Customize system instructions, review format, and explanation style

### Finding the Right max_tokens

Start with 8192. If you get errors, reduce to 6144 or 4096. If responses get cut off, increase to 12288.

## Installation

### From Chrome Web Store

Install from [Chrome Web Store](https://chrome.google.com/webstore/detail/codereviewgpt/amdfidcajdihmbhmmgohhkoaijpkocdn).

### Build from source

```bash
git clone https://github.com/sturdy-dev/codereview.gpt.git
cd codereview.gpt
npm install
npm run build
```

Then:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build` folder

## FAQ

**Are the reviews trustworthy?**  
Use them as suggestions, not gospel. AI can spot real issues but also hallucinates occasionally. Re-run the review if something seems off.

**What data does it analyze?**  
The extension sends code diffs (patch format), commit messages, and PR/MR description to the API. Nothing is stored on any servers - everything goes directly to your configured API endpoint.

**Does it post comments automatically?**  
No. The review appears only in the extension window. Copy-paste any useful feedback manually.

**Why use this?**  
Catch bugs you missed, learn best practices, get a second opinion, or just pretend to work while gaming.

## Privacy

- All API calls go directly to your configured endpoint (OpenAI, OpenRouter, local server, etc.)
- No data is sent to third-party servers
- API keys are stored locally in Chrome's secure storage
- Reviews are cached temporarily in session storage for performance

## Supported Browsers

Chrome and Chromium-based browsers (Edge, Brave, etc.)

## License

MIT - see [LICENSE.txt](LICENSE.txt)

---

Original project by [sturdy-dev](https://github.com/sturdy-dev/codereview.gpt)
