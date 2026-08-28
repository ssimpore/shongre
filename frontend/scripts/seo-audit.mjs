#!/usr/bin/env node

const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith("--"));
const originInput = positional[0] || process.env.SEO_ORIGIN;
const jsonOutput = args.includes("--json");
const maxPagesArgument = args.find((value) => value.startsWith("--max-pages="));
const maxPages = Math.max(
  1,
  Math.min(100, Number(maxPagesArgument?.split("=")[1] || 25)),
);

if (!originInput) {
  console.error(
    "Usage: node scripts/seo-audit.mjs <origin> [--max-pages=25] [--json]",
  );
  process.exit(2);
}

let targetOrigin;
try {
  const parsed = new URL(originInput);
  if (
    !/^https?:$/.test(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("unsupported origin");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  targetOrigin = parsed.origin;
} catch {
  console.error(`Invalid SEO audit origin: ${originInput}`);
  process.exit(2);
}

const findings = [];
const pages = [];

function report(severity, code, message, url) {
  findings.push({ severity, code, message, ...(url ? { url } : {}) });
}

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value = "") {
  return decodeHtml(
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
      (match) => [
        match[1].toLowerCase(),
        decodeHtml(match[2] ?? match[3] ?? ""),
      ],
    ),
  );
}

function inspectHtml(html) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) =>
    attributes(match[0]),
  );
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) =>
    attributes(match[0]),
  );
  const canonical = links.filter((link) => link.rel === "canonical");
  const alternates = links.filter(
    (link) => link.rel === "alternate" && link.hreflang && link.href,
  );
  const robots = metaTags.find((meta) => meta.name === "robots")?.content || "";
  const description =
    metaTags.find((meta) => meta.name === "description")?.content || "";
  const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const anchors = [
    ...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/gi),
  ]
    .map((match) => decodeHtml(match[1] || match[2] || ""))
    .filter(Boolean);
  const structuredData = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      structuredData.push(JSON.parse(match[1]));
    } catch (error) {
      structuredData.push({ __parseError: error.message });
    }
  }
  return {
    title,
    description,
    robots,
    h1,
    canonical,
    alternates,
    anchors,
    structuredData,
  };
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      redirect: options.redirect || "manual",
      headers: {
        accept: options.accept || "text/html,application/xhtml+xml",
        "user-agent": "Shongre-SEO-Audit/1.0",
      },
      signal: controller.signal,
    });
    const body = options.body === false ? "" : await response.text();
    return {
      response,
      body,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    report("error", "REQUEST_FAILED", error.message, url);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizedUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value;
  }
}

async function inspectPage(url, expectedSitemapUrl = false) {
  const result = await request(url);
  if (!result) return null;
  const { response, body, durationMs } = result;
  const html = inspectHtml(body);
  const robotsHeader = response.headers.get("x-robots-tag") || "";
  const effectiveRobots = `${html.robots} ${robotsHeader}`.toLowerCase();
  const indexable =
    response.status === 200 && !effectiveRobots.includes("noindex");
  const record = {
    url,
    status: response.status,
    durationMs,
    title: html.title,
    description: html.description,
    h1: html.h1,
    canonical: html.canonical.map((entry) => entry.href),
    robots: effectiveRobots.trim(),
    structuredDataTypes: html.structuredData.map(
      (entry) => entry?.["@type"] || "unknown",
    ),
  };
  pages.push(record);

  if (expectedSitemapUrl && response.status !== 200) {
    report(
      "error",
      "SITEMAP_URL_STATUS",
      `Sitemap URL returned ${response.status}.`,
      url,
    );
  }
  if (response.status === 200) {
    if (!html.title) report("error", "TITLE_MISSING", "Missing title.", url);
    if (!html.description)
      report("error", "DESCRIPTION_MISSING", "Missing meta description.", url);
    if (html.canonical.length !== 1) {
      report(
        "error",
        "CANONICAL_COUNT",
        `Expected one canonical, found ${html.canonical.length}.`,
        url,
      );
    } else if (
      expectedSitemapUrl &&
      normalizedUrl(html.canonical[0].href) !== normalizedUrl(url)
    ) {
      report(
        "error",
        "SITEMAP_CANONICAL_MISMATCH",
        `Canonical ${html.canonical[0].href} does not match sitemap URL.`,
        url,
      );
    }
    if (indexable && !html.h1) {
      report(
        "error",
        "H1_MISSING",
        "Indexable response has no initial-HTML H1.",
        url,
      );
    }
    if (expectedSitemapUrl && !indexable) {
      report(
        "error",
        "SITEMAP_URL_NOINDEX",
        "Sitemap URL is not indexable.",
        url,
      );
    }
    html.structuredData.forEach((entry) => {
      if (entry?.__parseError) {
        report("error", "JSONLD_INVALID", entry.__parseError, url);
      }
    });
  }
  return { response, html, indexable };
}

function xmlLocations(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) =>
    decodeHtml(match[1].trim()),
  );
}

async function collectSitemapUrls(sitemapUrl, visited = new Set()) {
  if (visited.has(sitemapUrl) || visited.size >= 100) return [];
  visited.add(sitemapUrl);
  const result = await request(sitemapUrl, {
    accept: "application/xml,text/xml",
  });
  if (!result) return [];
  if (result.response.status !== 200) {
    report(
      "error",
      "SITEMAP_STATUS",
      `Sitemap returned ${result.response.status}.`,
      sitemapUrl,
    );
    return [];
  }
  const locations = xmlLocations(result.body);
  if (/<sitemapindex\b/i.test(result.body)) {
    const nested = [];
    for (const child of locations) {
      if (new URL(child).host !== new URL(sitemapUrl).host) {
        report(
          "error",
          "SITEMAP_WRONG_HOST",
          "Cross-host child sitemap.",
          child,
        );
        continue;
      }
      nested.push(...(await collectSitemapUrls(child, visited)));
    }
    return nested;
  }
  if (!/<urlset\b/i.test(result.body)) {
    report(
      "error",
      "SITEMAP_XML_INVALID",
      "Missing urlset or sitemapindex root.",
      sitemapUrl,
    );
    return [];
  }
  return locations;
}

function safePublicLink(value, base) {
  try {
    const url = new URL(value, base);
    if (url.origin !== new URL(targetOrigin).origin) return null;
    if (!/^https?:$/.test(url.protocol)) return null;
    if (
      /^\/(?:admin|compte|deposer|messages|connexion|inscription|auth|account)(?:\/|$)/.test(
        url.pathname,
      )
    ) {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

const robotsUrl = `${targetOrigin}/robots.txt`;
const robotsResult = await request(robotsUrl, { accept: "text/plain" });
let lowerEnvironment = false;
let sitemapUrls = [];
if (!robotsResult) {
  report(
    "error",
    "ROBOTS_UNAVAILABLE",
    "robots.txt could not be read.",
    robotsUrl,
  );
} else if (robotsResult.response.status !== 200) {
  report(
    "error",
    "ROBOTS_STATUS",
    `robots.txt returned ${robotsResult.response.status}.`,
    robotsUrl,
  );
} else {
  lowerEnvironment = /^\s*Disallow:\s*\/\s*$/im.test(robotsResult.body);
  const declaredSitemaps = [
    ...robotsResult.body.matchAll(/^\s*Sitemap:\s*(\S+)/gim),
  ].map((match) => match[1]);
  if (lowerEnvironment) {
    const sitemap = await request(`${targetOrigin}/sitemap.xml`, {
      accept: "application/xml,text/xml",
    });
    if (sitemap?.response.status !== 404) {
      report(
        "error",
        "NONPROD_SITEMAP_EXPOSED",
        "A crawl-blocked environment must return 404 for its public sitemap.",
        `${targetOrigin}/sitemap.xml`,
      );
    }
  } else {
    if (!declaredSitemaps.length) {
      report(
        "error",
        "ROBOTS_SITEMAP_MISSING",
        "Production robots.txt has no sitemap.",
        robotsUrl,
      );
    }
    for (const sitemap of declaredSitemaps) {
      if (new URL(sitemap).host !== new URL(targetOrigin).host) {
        report(
          "error",
          "ROBOTS_SITEMAP_WRONG_HOST",
          "robots.txt references another host.",
          sitemap,
        );
        continue;
      }
      sitemapUrls.push(...(await collectSitemapUrls(sitemap)));
    }
  }
}

sitemapUrls = Array.from(new Set(sitemapUrls));
for (const url of sitemapUrls) {
  if (new URL(url).host !== new URL(targetOrigin).host) {
    report(
      "error",
      "SITEMAP_URL_WRONG_HOST",
      "Sitemap entry belongs to another host.",
      url,
    );
  }
}

const representativeUrls = lowerEnvironment
  ? [
      `${targetOrigin}/`,
      `${targetOrigin}/categories`,
      `${targetOrigin}/recherche?query=seo-audit`,
      `${targetOrigin}/annonce/list-102`,
      `${targetOrigin}/emploi/offre/developpeur-se-front-end-react-job-react-lyon`,
      `${targetOrigin}/aide`,
    ]
  : sitemapUrls.slice(0, maxPages);

const inspected = new Map();
for (const url of representativeUrls) {
  const result = await inspectPage(url, sitemapUrls.includes(url));
  if (result) inspected.set(url, result);
}

const missingUrl = `${targetOrigin}/__seo_audit_missing_resource__`;
const missing = await request(missingUrl);
if (missing && missing.response.status !== 404) {
  report(
    "error",
    "SOFT_404",
    `Unknown public route returned ${missing.response.status}, expected 404.`,
    missingUrl,
  );
}

const linksToCheck = Array.from(
  new Set(
    [...inspected.entries()].flatMap(([pageUrl, result]) =>
      result.html.anchors
        .map((href) => safePublicLink(href, pageUrl))
        .filter(Boolean),
    ),
  ),
).slice(0, 40);
for (const url of linksToCheck) {
  const result = await request(url, { body: false });
  if (result && result.response.status >= 400) {
    report(
      "error",
      "BROKEN_INTERNAL_LINK",
      `Internal link returned ${result.response.status}.`,
      url,
    );
  }
}

for (const [pageUrl, result] of inspected) {
  for (const alternate of result.html.alternates.slice(0, 10)) {
    const alternateResult = await request(alternate.href);
    if (!alternateResult || alternateResult.response.status !== 200) {
      report(
        "error",
        "HREFLANG_TARGET_STATUS",
        "hreflang target is unavailable.",
        alternate.href,
      );
      continue;
    }
    const targetHtml = inspectHtml(alternateResult.body);
    const reciprocal = targetHtml.alternates.some(
      (entry) => normalizedUrl(entry.href) === normalizedUrl(pageUrl),
    );
    if (alternate.hreflang !== "x-default" && !reciprocal) {
      report(
        "error",
        "HREFLANG_NOT_RECIPROCAL",
        `Alternate does not link back to ${pageUrl}.`,
        alternate.href,
      );
    }
  }
}

const summary = {
  origin: targetOrigin,
  mode: lowerEnvironment ? "non-production" : "production",
  sitemapUrlCount: sitemapUrls.length,
  pagesChecked: pages.length,
  internalLinksChecked: linksToCheck.length,
  errors: findings.filter((finding) => finding.severity === "error").length,
  warnings: findings.filter((finding) => finding.severity === "warning").length,
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, findings, pages }, null, 2));
} else {
  console.log(`SEO audit: ${summary.origin} (${summary.mode})`);
  console.log(
    `Checked ${summary.pagesChecked} pages, ${summary.sitemapUrlCount} sitemap URLs, and ${summary.internalLinksChecked} public internal links.`,
  );
  findings.forEach((finding) =>
    console.log(
      `${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}${finding.url ? ` (${finding.url})` : ""}`,
    ),
  );
  if (!findings.length) console.log("PASS No critical SEO audit findings.");
}

process.exitCode = summary.errors ? 1 : 0;
