export interface AnalyticsAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  firstSource?: string;
  firstMedium?: string;
  firstCampaign?: string;
}

const FIRST_TOUCH_KEY = "shongre_analytics_first_touch_v1";
const LAST_TOUCH_KEY = "shongre_analytics_last_touch_v1";

function read(key: string): AnalyticsAttribution {
  try {
    return JSON.parse(
      localStorage.getItem(key) || "{}",
    ) as AnalyticsAttribution;
  } catch {
    return {};
  }
}

export function parseAttribution(search: string): AnalyticsAttribution {
  const params = new URLSearchParams(search);
  const value = (name: string) => params.get(name)?.trim().slice(0, 240);
  return {
    source: value("utm_source"),
    medium: value("utm_medium"),
    campaign: value("utm_campaign"),
    term: value("utm_term"),
    content: value("utm_content"),
  };
}

export function captureAttribution(): AnalyticsAttribution {
  if (typeof window === "undefined") return {};
  const current = parseAttribution(window.location.search);
  const first = read(FIRST_TOUCH_KEY);
  if (!Object.values(current).some(Boolean)) {
    const last = read(LAST_TOUCH_KEY);
    return {
      ...last,
      firstSource: first.source,
      firstMedium: first.medium,
      firstCampaign: first.campaign,
    };
  }
  try {
    if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(current));
    }
    localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(current));
  } catch {
    // Storage can be blocked; attribution remains valid for this page only.
  }
  const resolvedFirst = Object.values(first).some(Boolean) ? first : current;
  return {
    ...current,
    firstSource: resolvedFirst.source,
    firstMedium: resolvedFirst.medium,
    firstCampaign: resolvedFirst.campaign,
  };
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FIRST_TOUCH_KEY);
    localStorage.removeItem(LAST_TOUCH_KEY);
  } catch {
    // Nothing else to revoke.
  }
}
