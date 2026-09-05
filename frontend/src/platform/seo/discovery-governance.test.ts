import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import {
  buildDiscoveryRobotsRules,
  DISCOVERY_CRAWLERS,
  parseModelTrainingCrawlerPolicy,
  PRIVATE_CRAWL_PATHS,
  renderDiscoveryManifest,
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
