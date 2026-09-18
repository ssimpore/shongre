/**
 * User agents that must find a page's metadata inside `<head>` of the initial
 * HTML.
 *
 * Next streams `generateMetadata` output into the body for every other client
 * and leaves it to the browser's React runtime to place; in the Web
 * application the streamed `<title>`, description, robots and canonical tags
 * stay under `<body>` after hydration. A person's browser reads them there. A
 * crawler that does not run scripts never will, and Google documents that a
 * canonical outside `<head>` is ignored — so every search, preview and
 * answer-engine crawler is served the blocking render. Next's `htmlLimitedBots`
 * option replaces its default list rather than extending it, so that list is
 * restated here, followed by Googlebot itself (whose rendering pipeline must
 * not be relied on for a canonical) and the answer-engine crawlers the Web
 * application governs in robots.txt.
 *
 * Lives in the contracts package because `next.config.ts` can only load
 * package exports, not application source.
 */
const HEAD_METADATA_CRAWLER_NAMES = [
  "[\\w-]+-Google",
  "Google-[\\w-]+",
  "Chrome-Lighthouse",
  "Slurp",
  "DuckDuckBot",
  "baiduspider",
  "yandex",
  "sogou",
  "bitlybot",
  "tumblr",
  "vkShare",
  "quora link preview",
  "redditbot",
  "ia_archiver",
  "Bingbot",
  "BingPreview",
  "applebot",
  "facebookexternalhit",
  "facebookcatalog",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "SkypeUriPreview",
  "Yeti",
  "googleweblight",
  "Googlebot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "meta-externalagent",
  "DuckAssistBot",
] as const;

export const HEAD_METADATA_CRAWLER_PATTERN = new RegExp(
  HEAD_METADATA_CRAWLER_NAMES.join("|"),
  "i",
);
