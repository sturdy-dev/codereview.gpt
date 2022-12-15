# codereview.gpt

<p align="center">
  <img src="https://raw.githubusercontent.com/sturdy-dev/codereview.gpt/main/public/icons/icon_128.png">
</p>
<p align='center'>
    Review GitHub Pull Requests using ChatGPT so that you can pretent do work.
</p>
<p align='center'>
    <a href="https://github.com/sturdy-dev/codereview.gpt/blob/main/LICENSE.txt">
        <img alt="GitHub"
        src="https://img.shields.io/github/license/sturdy-dev/codereview.gpt">
    </a>
    <a href="https://chrome.google.com/webstore/detail/codereviewgpt/amdfidcajdihmbhmmgohhkoaijpkocdn">
      <img alt="Chrome Web Store"
      src="https://img.shields.io/chrome-web-store/v/amdfidcajdihmbhmmgohhkoaijpkocdn">
    </a>
</p>
<p align="center">
  <a href="#overview">🔍 Overview</a> •
  <a href="#usage">💻 Usage</a> •
  <a href="#faq">📖 FAQ</a> •
  <a href="#installation">🔧 Installation</a>
</p>

## Overview

This is a Chrome extension which reviews Pull Requests for you using [ChatGPT](https://chat.openai.com/).

Here's an example output for [this](https://github.com/sturdy-dev/semantic-code-search/pull/17) Pull Request:

https://user-images.githubusercontent.com/4030927/207372123-46d7ee8c-bd3e-4272-8ccb-4639f9f71458.mp4

![example screenshot](https://raw.githubusercontent.com/sturdy-dev/codereview.gpt/main/docs/codereview_gpt_screenshot_1.png)

## Usage

- Navigate to a GitHub Pull Request that you want a review for.
- Click the extension icon
- If you have not already, the extension will ask you to log in at [chat.openai.com](https://chat.openai.com)
- You get code review comments from ChatGPT in the popup window

**NB:** Running the review multiple times often produces different feedback, so if you are dealing with a larger PR, it might be a good idea to do that to get the most out of it.

## FAQ

###

**Q:** Are the reviews 100% trustworthy?

**A:** Not yet, as of 2022. This tool can help you spot bugs, but as with anything, use your judgement. Sometimes it hallucinates things that sound plausible but are false — in this case, re-run the review.

###

**Q:** What aspects of the Pull Request are considered during the review?

**A:** The model gets the code changes and the commit messages in a [patch](https://git-scm.com/docs/git-format-patch) format.

###

**Q:** Does the extension post comments on the Pull Request page?

**A:** No. If you want any of the feedback as PR comments, you can just copy paste the output.

###

**Q:** Is this a GPT wrapper?

**A:** Yes, [but](https://twitter.com/creatine_cycle/status/1600331160776998913)

###

**Q:** Why would you want this?

**A:** Plenty of reasons! You can:

    - pretend to work while playing games instead
    - appear smart to your colleagues
    - enable a future skynet
    - actually catch some bugs you missed

## Installation

You can install `codereview.gpt` from the [Chrome Web Store](https://chrome.google.com/webstore/detail/codereviewgpt/amdfidcajdihmbhmmgohhkoaijpkocdn) or build it from source locally.

### From the Chrome Web Store (recommended)

Go to the [extension page](https://chrome.google.com) at the Chrome Web Store and add `codereview.gpt`.

### From source

- Clone this repository `git clone foo && cd foo`
- Install the dependencies `npm install`
- Run the build script `npm run build`
- Navigate to `chrome://extensions`
- Enable Developer Mode
- Click the 'Load unpacked' button and navigate to the `build` directory in the project

## Supported browsers

Currently, only Chrome is supported

## Permissions

This is a list of permissions the extension uses with the respective reason.

- `activeTab` is used to get the URL or the active tab. This is needed to fetch the get the Pull Request details
- `storage` is used to cache the responses from OpenAI

## Credits

This project is inspired by [clmnin/summarize.site](https://github.com/clmnin/summarize.site)

## License

Semantic Code Search is distributed under [AGPL-3.0-only](LICENSE.txt). For Apache-2.0 exceptions — <kiril@codeball.ai>
