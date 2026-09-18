import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import {
  buildDiscoveryRobotsRules,
  DISCOVERY_CRAWLERS,
  HEAD_METADATA_CRAWLER_PATTERN,
  parseModelTrainingCrawlerPolicy,
  PRIVATE_CRAWL_PATHS,
  renderDiscoveryManifest,
  validIndexNowKey,
  validWebmasterVerificationToken,
} from "./discovery-governance";
import { classifyAnswerEngineReferrer } from "./discovery-referrers";
import {
  normalizePublicSocialProfiles,
  organizationStructuredData,
  staticPageStructuredData,
} from "./discovery-structured-data";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

describe("SEO and GEO discovery governance", () => {
  it("blocks every crawler outside production", () => {
    expect(buildDiscoveryRobotsRules({ production: false })).toEqual([
      { userAgent: "*", disallow: "/" },
    ]);
  });

  it("allows public search retrieval while denying training by default", () => {
    const rules = buildDiscoveryRobotsRules({ production: true });
    const searchRule = rules.find(
      (rule) =>
        Array.isArray(rule.userAgent) &&
        rule.userAgent.includes(DISCOVERY_CRAWLERS.openAiSearch.userAgent),
    );
    const trainingRule = rules.find(
      (rule) => rule.userAgent === DISCOVERY_CRAWLERS.openAiTraining.userAgent,
    );
    expect(searchRule).toMatchObject({
      allow: "/",
      disallow: PRIVATE_CRAWL_PATHS,
    });
    expect(trainingRule).toEqual({ userAgent: "GPTBot", disallow: "/" });
  });

  it("protects private paths on every canonical market URL shape", () => {
    expect(PRIVATE_CRAWL_PATHS).toEqual(
      expect.arrayContaining([
        "/compte",
        "/be/compte",
        "/ch/messages",
        "/sn/paiement",
        "/bf/admin",
      ]),
    );
  });

  it("requires an explicit valid model-training policy", () => {
    expect(parseModelTrainingCrawlerPolicy(undefined)).toBe("deny");
    expect(parseModelTrainingCrawlerPolicy("ALLOW")).toBe("allow");
    expect(() => parseModelTrainingCrawlerPolicy("sometimes")).toThrow(
      "SEO_GPTBOT_TRAINING_POLICY",
    );
  });

  it.each([
    ["https://chatgpt.com/share/example", "chatgpt.com"],
    ["www.perplexity.ai", "perplexity.ai"],
    ["copilot.microsoft.com", "copilot.microsoft.com"],
    ["https://gemini.google.com/app", "gemini.google.com"],
  ])("classifies answer-engine referral %s", (referrer, source) => {
    expect(classifyAnswerEngineReferrer(referrer)).toEqual({
      source,
      medium: "organic_ai",
    });
  });

  it("does not classify deceptive lookalike hosts", () => {
    expect(
      classifyAnswerEngineReferrer("chatgpt.com.attacker.example"),
    ).toBeNull();
    expect(classifyAnswerEngineReferrer("not a host")).toBeNull();
  });

  it("normalizes only unique HTTPS social profiles", () => {
    expect(
      normalizePublicSocialProfiles([
        "https://www.linkedin.com/company/shongre",
        "https://www.linkedin.com/company/shongre",
        "http://example.com/insecure",
        "javascript:alert(1)",
      ]),
    ).toEqual(["https://www.linkedin.com/company/shongre"]);
  });

  it("keeps one stable organization identity across market sites", () => {
    const context = resolveMarketContext({
      hostname: "shongre.fr",
      pathname: "/",
      infrastructure,
    });
    const schemas = organizationStructuredData({
      context,
      canonicalUrl: "https://shongre.fr/",
      socialProfiles: ["https://www.linkedin.com/company/shongre"],
    });
    expect(schemas).toEqual([
      expect.objectContaining({
        "@type": "Organization",
        "@id": "https://shongre.com/#organization",
        name: "SHONGRE.",
        sameAs: ["https://www.linkedin.com/company/shongre"],
      }),
      expect.objectContaining({
        "@type": "WebSite",
        "@id": "https://shongre.fr/#website",
        publisher: { "@id": "https://shongre.com/#organization" },
      }),
    ]);
  });

  it("emits only applicable static-page schema", () => {
    expect(
      staticPageStructuredData({
        canonicalPath: "/contact",
        canonicalUrl: "https://shongre.fr/contact",
        title: "Contacter Shongre | SHONGRE.",
        description: "Contacter l'équipe Shongre.",
        locale: "fr-FR",
      }),
    ).toMatchObject({ "@type": "ContactPage", inLanguage: "fr-FR" });
    expect(
      staticPageStructuredData({
        canonicalPath: "/newsletter",
        canonicalUrl: "https://shongre.fr/newsletter",
        title: "Newsletter",
        description: "Newsletter",
      }),
    ).toBeNull();
  });

  it("rejects malformed webmaster verification tokens", () => {
    expect(validWebmasterVerificationToken(" abc_123 ")).toBe("abc_123");
    expect(() => validWebmasterVerificationToken("<script>")).toThrow(
      "verification token",
    );
  });

  it("accepts only protocol-compatible IndexNow keys", () => {
    expect(validIndexNowKey(" abcDEF-12345678 ")).toBe("abcDEF-12345678");
    expect(validIndexNowKey(undefined)).toBeUndefined();
    expect(() => validIndexNowKey("too short")).toThrow("INDEXNOW_KEY");
  });

  it("renders a bounded machine-readable discovery manifest", () => {
    const manifest = renderDiscoveryManifest({
      canonicalSite: "https://shongre.fr/",
      sitemap: "https://shongre.fr/sitemap.xml",
      links: [{ label: "À propos", url: "https://shongre.fr/a-propos" }],
    });
    expect(manifest).toContain("# SHONGRE.");
    expect(manifest).toContain("https://shongre.fr/sitemap.xml");
    expect(manifest).toContain("[À propos](https://shongre.fr/a-propos)");
    expect(manifest).toContain("private routes are not public sources");
  });
});

describe("head metadata crawlers", () => {
  it("routes every search, preview and answer-engine crawler to the blocking render", () => {
    for (const userAgent of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mediapartners-Google",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1",
      "GPTBot/1.2",
      "OAI-SearchBot/1.0",
      "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
      "ClaudeBot/1.0",
    ]) {
      expect(HEAD_METADATA_CRAWLER_PATTERN.test(userAgent), userAgent).toBe(
        true,
      );
    }
  });

  it("keeps every registered discovery crawler on the blocking render", () => {
    for (const { userAgent } of Object.values(DISCOVERY_CRAWLERS)) {
      expect(HEAD_METADATA_CRAWLER_PATTERN.test(userAgent), userAgent).toBe(
        true,
      );
    }
  });

  it("leaves browsers on the streamed render", () => {
    for (const userAgent of [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    ]) {
      expect(HEAD_METADATA_CRAWLER_PATTERN.test(userAgent), userAgent).toBe(
        false,
      );
    }
  });
});
