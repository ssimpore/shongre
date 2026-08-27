import { createSign } from "node:crypto";
import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { resolveMarketContext } from "@shongre/contracts";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

async function accessToken(account: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000)
    return tokenCache.token;
  const now = Math.floor(Date.now() / 1_000);
  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: tokenUri,
      iat: now,
      exp: now + 3_600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`search_console_oauth_${response.status}`);
  const body = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3_600) * 1_000,
  };
  return body.access_token;
}

function marketForPage(page: string): string | null {
  try {
    const url = new URL(page);
    const context = resolveMarketContext({
      hostname: url.host,
      pathname: url.pathname,
      infrastructure: config.marketInfrastructure,
      allowDevelopmentHosts: false,
    });
    return context.kind === "market" || context.kind === "coming_soon"
      ? context.countryCode
      : null;
  } catch {
    return null;
  }
}

function finalizedDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 3);
  return date.toISOString().slice(0, 10);
}

export class SearchConsoleWorker {
  constructor(
    private readonly dependencies: {
      fetcher?: typeof fetch;
      tokenProvider?: (account: ServiceAccount) => Promise<string>;
      client?: () => any;
    } = {},
  ) {}

  private get fetcher(): typeof fetch {
    return this.dependencies.fetcher ?? fetch;
  }
  private get tokenProvider() {
    return this.dependencies.tokenProvider ?? accessToken;
  }
  private client(): any {
    return this.dependencies.client?.() ?? getSupabaseAdminClient();
  }

  async run(): Promise<{ sites: number; rows: number }> {
    const provider = config.analyticsProviders.searchConsole;
    if (config.analyticsMode === "off" || !provider.enabled)
      return { sites: 0, rows: 0 };
    const account = JSON.parse(provider.serviceAccountJson) as ServiceAccount;
    if (!account.client_email || !account.private_key)
      throw new Error("search_console_service_account_invalid");
    const date = finalizedDate();
    let imported = 0;
    let token: string;
    try {
      token = await this.tokenProvider(account);
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message.slice(0, 80)
          : "search_console_oauth_failed";
      await Promise.all(
        provider.siteUrls.map((siteUrl) =>
          this.recordState(siteUrl, date, code),
        ),
      );
      throw error;
    }
    for (const siteUrl of provider.siteUrls) {
      try {
        imported += await this.syncSite(siteUrl, token, date);
        await this.recordState(siteUrl, date);
      } catch (error) {
        const code =
          error instanceof Error
            ? error.message.slice(0, 80)
            : "search_console_sync_failed";
        await this.recordState(siteUrl, date, code);
        throw error;
      }
    }
    return { sites: provider.siteUrls.length, rows: imported };
  }

  private async syncSite(
    siteUrl: string,
    token: string,
    date: string,
  ): Promise<number> {
    let imported = 0;
    let startRow = 0;
    for (;;) {
      const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
      const response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startDate: date,
          endDate: date,
          dimensions: ["date", "query", "page", "country", "device"],
          dataState: "final",
          rowLimit: 25_000,
          startRow,
        }),
      });
      if (!response.ok)
        throw new Error(`search_console_http_${response.status}`);
      const payload = (await response.json()) as {
        rows?: SearchAnalyticsRow[];
      };
      const rows = (payload.rows ?? []).flatMap((row) => {
        const [metricDate, query, page, country, device] = row.keys ?? [];
        const marketCode = marketForPage(page || "");
        if (!metricDate || !page || !marketCode) return [];
        return [
          {
            metric_date: metricDate,
            site_url: siteUrl,
            market_code: marketCode,
            query: (query || "").slice(0, 500),
            page: page.split(/[?#]/, 1)[0].slice(0, 1_000),
            country: (country || "").slice(0, 8),
            device: (device || "").slice(0, 30),
            clicks: Math.round(row.clicks || 0),
            impressions: Math.round(row.impressions || 0),
            ctr: row.ctr || 0,
            position: row.position || 0,
            data_state: "final",
            imported_at: new Date().toISOString(),
          },
        ];
      });
      if (rows.length) {
        const client = this.client();
        const { error } = await client
          .from("analytics_seo_daily")
          .upsert(rows, {
            onConflict:
              "metric_date,site_url,market_code,query,page,country,device",
          });
        if (error) throw error;
        imported += rows.length;
      }
      if ((payload.rows?.length ?? 0) < 25_000) return imported;
      startRow += 25_000;
    }
  }

  private async recordState(
    siteUrl: string,
    date: string,
    errorCode?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const client = this.client();
    const state = errorCode
      ? {
          provider: "search_console",
          scope: siteUrl,
          cursor: date,
          last_failure_at: now,
          last_error_code: errorCode,
          updated_at: now,
        }
      : {
          provider: "search_console",
          scope: siteUrl,
          cursor: date,
          last_successful_at: now,
          last_failure_at: null,
          last_error_code: null,
          updated_at: now,
        };
    const { error } = await client.from("analytics_sync_state").upsert(state, {
      onConflict: "provider,scope",
    });
    if (error) throw error;
  }
}

export const searchConsoleWorker = new SearchConsoleWorker();
