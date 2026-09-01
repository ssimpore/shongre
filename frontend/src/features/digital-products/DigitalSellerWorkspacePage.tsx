import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DigitalPolicyProjection,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import { Check, FileKey2, ShieldCheck } from "lucide-react";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { Badge, Button, Checkbox, Skeleton } from "../../design-system";
import { FormField, Input } from "../../design-system/primitives/FormField";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../i18n/digital.catalogue.fr";

const OPTIONS: Array<{
  type: FulfillmentType;
  key:
    | "digital.fulfillment.physical"
    | "digital.fulfillment.file"
    | "digital.fulfillment.link"
    | "digital.fulfillment.credentials"
    | "digital.fulfillment.provisioned";
}> = [
  { type: "PHYSICAL", key: "digital.fulfillment.physical" },
  { type: "FILE_DOWNLOAD", key: "digital.fulfillment.file" },
  { type: "ACCESS_LINK", key: "digital.fulfillment.link" },
  { type: "ACCESS_CREDENTIALS", key: "digital.fulfillment.credentials" },
  { type: "SELLER_PROVISIONED", key: "digital.fulfillment.provisioned" },
];

const formatBytes = (value: number, locale: string) =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1_048_576)} Mo`;

export const DigitalSellerWorkspacePage: React.FC = () => {
  const { t, locale } = useTranslation(digitalMessagesFr);
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  usePageMeta({
    title: t("meta.digitalSeller.title"),
    description: t("meta.digitalSeller.description"),
    canonicalPath: "/compte/produits-numeriques",
    noIndex: true,
  });

  const [policy, setPolicy] = useState<DigitalPolicyProjection | null>(null);
  const [profile, setProfile] = useState<DigitalSellerProfile | null>(null);
  const [selected, setSelected] = useState<FulfillmentType[]>(["PHYSICAL"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tasks, setTasks] = useState<DigitalProvisioningTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [username, setUsername] = useState("");
  const [accessSecret, setAccessSecret] = useState("");

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(false);
    try {
      const [nextPolicy, nextProfile, nextTasks] = await Promise.all([
        services.digitalProducts.getPolicy(activeMarket.code),
        services.digitalProducts.getSellerProfile(
          activeMarket.code,
          currentUser.id,
        ),
        services.digitalProducts.listSellerProvisioningTasks(
          activeMarket.code,
          currentUser.id,
        ),
      ]);
      setPolicy(nextPolicy);
      setProfile(nextProfile);
      setSelected(nextProfile?.fulfillmentTypes ?? ["PHYSICAL"]);
      setTasks(nextTasks);
    } catch {
      setPolicy(null);
      setProfile(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, currentUser?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const digitalSelection = useMemo(
    () => selected.filter((type) => type !== "PHYSICAL"),
    [selected],
  );
  const combinationAllowed = useMemo(
    () =>
      Boolean(
        policy &&
        digitalSelection.length &&
        policy.allowedFulfillmentCombinations.some(
          (combination) =>
            combination.length === digitalSelection.length &&
            combination.every((type) => digitalSelection.includes(type)),
        ),
      ),
    [digitalSelection, policy],
  );

  const toggle = (type: FulfillmentType) => {
    setSaved(false);
    setSelected((current) =>
      current.includes(type)
        ? current.filter((candidate) => candidate !== type)
        : [...current, type],
    );
  };

  const save = async () => {
    if (!currentUser?.id || !policy || !combinationAllowed) return;
    setSaving(true);
    setError(false);
    try {
      const next = await services.digitalProducts.acceptSellerResponsibilities(
        activeMarket.code,
        currentUser.id,
        selected,
        policy.version,
      );
      setProfile(next);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const submitProvisioning = async (task: DigitalProvisioningTask) => {
    if (!accessSecret.trim() || !destinationUrl.trim()) return;
    setActiveTaskId(task.id);
    setError(false);
    try {
      await services.digitalProducts.submitProvisionedAccess(
        activeMarket.code,
        task.entitlementId,
        {
          productAccessClass: task.productAccessClass,
          destinationUrl: destinationUrl.trim(),
          fields: [
            ...(username.trim()
              ? [
                  {
                    kind: "USERNAME" as const,
                    label: t("digital.seller.username"),
                    value: username.trim(),
                  },
                ]
              : []),
            {
              kind: "PASSWORD",
              label: t("digital.seller.accessSecret"),
              value: accessSecret,
            },
          ],
        },
      );
      setDestinationUrl("");
      setUsername("");
      setAccessSecret("");
      await load();
    } catch {
      setError(true);
    } finally {
      setActiveTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-2 text-primary">
          <FileKey2 className="h-icon-md w-icon-md" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {t("digital.common.title")}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-text-main">
          {t("digital.seller.title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">
          {t("digital.seller.description")}
        </p>
      </header>

      {loading ? <Skeleton className="h-96 rounded-2xl" /> : null}

      {!loading && (error || !policy) ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger-border bg-danger-surface p-5"
        >
          <p className="text-sm font-bold text-danger">
            {t("digital.common.error")}
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void load()}
          >
            {t("digital.common.retry")}
          </Button>
        </div>
      ) : null}

      {!loading && policy ? (
        <>
          {!policy.enabled || !policy.capabilities.onboarding ? (
            <div
              role="status"
              className="rounded-2xl border border-warning-border bg-warning-surface p-5 text-sm text-warning"
            >
              {t("digital.fulfillment.policyDisabled")}
            </div>
          ) : null}

          <section
            className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
            aria-labelledby="seller-digital-modes"
          >
            <h2
              id="seller-digital-modes"
              className="text-lg font-black text-text-main"
            >
              {t("digital.fulfillment.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("digital.fulfillment.description")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {OPTIONS.map((option) => {
                const allowed =
                  option.type === "PHYSICAL" ||
                  policy.allowedFulfillmentTypes.includes(option.type);
                return (
                  <label
                    key={option.type}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border p-4 ${allowed ? "border-border-base" : "border-border-subtle opacity-50"}`}
                  >
                    <Checkbox
                      checked={selected.includes(option.type)}
                      disabled={!allowed || !policy.capabilities.onboarding}
                      onChange={() => toggle(option.type)}
                    />
                    <span className="text-sm font-bold text-text-main">
                      {t(option.key)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-text-secondary">
              {t("digital.seller.noReacceptance")}
            </p>
          </section>

          <section
            className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
            aria-labelledby="seller-digital-requirements"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="h-icon-md w-icon-md text-success"
                aria-hidden="true"
              />
              <h2
                id="seller-digital-requirements"
                className="text-lg font-black text-text-main"
              >
                {t("digital.seller.requirements")}
              </h2>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              {t("digital.seller.security")}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-bg-base p-3">
                <dt className="text-xs font-bold text-text-secondary">
                  {t("digital.seller.files")}
                </dt>
                <dd className="mt-1 text-sm text-text-main">
                  {policy.maxFileCount} ·{" "}
                  {formatBytes(policy.maxFileSizeBytes, locale)} ·{" "}
                  {policy.allowedFileExtensions.join(", ") || "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-bg-base p-3">
                <dt className="text-xs font-bold text-text-secondary">
                  {t("digital.seller.verification")}
                </dt>
                <dd className="mt-1 text-sm text-text-main">
                  {policy.requiredVerificationDimensions.join(", ") || "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-bg-base p-3">
                <dt className="text-xs font-bold text-text-secondary">
                  {t("digital.seller.provisioningDeadline")}
                </dt>
                <dd className="mt-1 text-sm text-text-main">
                  {policy.provisioningDeadlineHours} h
                </dd>
              </div>
              <div className="rounded-xl bg-bg-base p-3">
                <dt className="text-xs font-bold text-text-secondary">
                  {t("digital.seller.accessLimits")}
                </dt>
                <dd className="mt-1 text-sm text-text-main">
                  {policy.defaultDownloadLimit} / {policy.defaultRevealLimit}
                </dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-3">
              {policy.requirements.map((requirement) => (
                <li
                  key={requirement.id}
                  className="rounded-xl border border-border-base p-4"
                >
                  <div className="font-bold text-text-main">
                    {requirement.label[locale] ?? requirement.label["fr-FR"]}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {requirement.description[locale] ??
                      requirement.description["fr-FR"]}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
            aria-labelledby="seller-digital-tasks"
          >
            <h2
              id="seller-digital-tasks"
              className="text-lg font-black text-text-main"
            >
              {t("digital.seller.tasks")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("digital.seller.tasksDescription")}
            </p>
            <div className="mt-4 space-y-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("digital.seller.noTasks")}
                </p>
              ) : (
                tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-xl border border-border-base p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-text-main">
                          {task.title}
                        </h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          {t("digital.seller.taskDeadline", {
                            date: new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(task.deadlineAt)),
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.status === "COMPLETED"
                            ? "success"
                            : task.status === "ESCALATED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                    {task.status === "PENDING" ||
                    task.status === "IN_PROGRESS" ||
                    task.status === "RETRY_PENDING" ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <FormField
                          label={t("digital.seller.destinationUrl")}
                          required
                        >
                          <Input
                            type="url"
                            autoComplete="off"
                            value={destinationUrl}
                            onChange={(event) =>
                              setDestinationUrl(event.target.value)
                            }
                          />
                        </FormField>
                        <FormField label={t("digital.seller.username")}>
                          <Input
                            autoComplete="off"
                            value={username}
                            onChange={(event) =>
                              setUsername(event.target.value)
                            }
                          />
                        </FormField>
                        <FormField
                          label={t("digital.seller.accessSecret")}
                          required
                        >
                          <Input
                            type="password"
                            autoComplete="new-password"
                            value={accessSecret}
                            onChange={(event) =>
                              setAccessSecret(event.target.value)
                            }
                          />
                        </FormField>
                        <div className="flex items-end">
                          <Button
                            disabled={
                              !destinationUrl.trim() ||
                              !accessSecret ||
                              activeTaskId === task.id
                            }
                            isLoading={activeTaskId === task.id}
                            onClick={() => void submitProvisioning(task)}
                          >
                            {t("digital.seller.completeTask")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={
                !policy.enabled ||
                !policy.capabilities.onboarding ||
                !combinationAllowed ||
                saving
              }
              isLoading={saving}
              onClick={() => void save()}
            >
              {t("digital.seller.save")}
            </Button>
            {digitalSelection.length > 0 && !combinationAllowed ? (
              <span role="status" className="text-sm text-warning">
                {t("digital.seller.invalidCombination")}
              </span>
            ) : null}
            {profile?.policyVersion === policy.version || saved ? (
              <Badge variant="success">
                <Check
                  className="mr-1 h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
                {t("digital.seller.current", { version: policy.version })}
              </Badge>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
};
