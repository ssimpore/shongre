import {
  createDefaultHomepageConfiguration,
  homepageConfigurationSchema,
  type HomepageConfiguration,
} from "@shongre/contracts/homepage";
import { storageService } from "../../services/storage.service";
import { telemetryService } from "../../services/telemetry.service";

const STORAGE_PREFIX = "shongre_homepage_configuration_v1";

const key = (
  marketCode: string,
  locale: string,
  state: "draft" | "published",
) => `${STORAGE_PREFIX}_${marketCode.trim().toUpperCase()}_${locale}_${state}`;

function read(
  marketCode: string,
  locale: string,
  state: "draft" | "published",
): HomepageConfiguration | null {
  const stored = storageService.get<unknown>(
    key(marketCode, locale, state),
    null,
  );
  if (!stored) return null;
  const parsed = homepageConfigurationSchema.safeParse(stored);
  if (parsed.success) return structuredClone(parsed.data);
  telemetryService.captureException(
    new Error("Invalid persisted homepage configuration ignored."),
    "homepage-configuration-read",
  );
  return null;
}

export function getPublishedHomepageConfiguration(
  marketCode: string,
  locale: string,
): HomepageConfiguration {
  return (
    read(marketCode, locale, "published") ??
    createDefaultHomepageConfiguration({ marketCode, locale })
  );
}

export function getDraftHomepageConfiguration(
  marketCode: string,
  locale: string,
): HomepageConfiguration {
  const stored = read(marketCode, locale, "draft");
  if (stored) return stored;
  const published = getPublishedHomepageConfiguration(marketCode, locale);
  return {
    ...structuredClone(published),
    id: `homepage:${published.marketCode}:${locale}:${published.revision + 1}`,
    revision: published.revision + 1,
    state: "draft",
    publishedAt: undefined,
  };
}

export function saveDraftHomepageConfiguration(
  configuration: HomepageConfiguration,
  changeReason: string,
): HomepageConfiguration {
  const currentDraft = read(
    configuration.marketCode,
    configuration.locale,
    "draft",
  );
  const revision = currentDraft
    ? Math.max(currentDraft.revision + 1, configuration.revision)
    : configuration.revision;
  const next = homepageConfigurationSchema.parse({
    ...configuration,
    id: `homepage:${configuration.marketCode}:${configuration.locale}:${revision}`,
    revision,
    state: "draft",
    changeReason,
    updatedAt: new Date().toISOString(),
    publishedAt: undefined,
  });
  storageService.set(key(next.marketCode, next.locale, "draft"), next);
  return structuredClone(next);
}

export function publishDraftHomepageConfiguration(
  marketCode: string,
  locale: string,
  changeReason: string,
): HomepageConfiguration {
  const draft = getDraftHomepageConfiguration(marketCode, locale);
  const published = homepageConfigurationSchema.parse({
    ...draft,
    state: "published",
    changeReason,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  storageService.set(key(marketCode, locale, "published"), published);
  storageService.remove(key(marketCode, locale, "draft"));
  return structuredClone(published);
}
