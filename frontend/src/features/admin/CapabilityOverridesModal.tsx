import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AlertTriangle, KeyRound, Search } from "lucide-react";
import {
  CAPABILITIES,
  CAPABILITY_OVERRIDE_REASON_MAX_LENGTH,
  CAPABILITY_OVERRIDE_REASON_MIN_LENGTH,
  OWNER_ONLY_CAPABILITIES,
  type Capability,
  type CapabilityManagementProjection,
  type CapabilityIneffectiveReason,
} from "@shongre/contracts/access-control";
import { Button, FormField, Modal, Textarea } from "../../design-system";
import { services } from "../../api/client/service-registry";
import type { UserProfile } from "../../types";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { ALL_PERMISSIONS } from "../../security/permissions";

type OverrideMode = "none" | "grant" | "revoke";

const OWNER_ONLY_CAPABILITY_SET = new Set<Capability>(OWNER_ONLY_CAPABILITIES);
const SENSITIVE_CAPABILITY_SET = new Set<Capability>(
  ALL_PERMISSIONS.filter((permission) => permission.isSensitive).map(
    (permission) => permission.id,
  ),
);

const reasonKey = (reason: CapabilityIneffectiveReason): MessageKey =>
  `admin.capabilities.ineffective.${reason}` as MessageKey;

export interface CapabilityOverridesModalProps {
  user: UserProfile;
  actorIsOwner: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export const CapabilityOverridesModal: React.FC<
  CapabilityOverridesModalProps
> = ({ user, actorIsOwner, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const [projection, setProjection] =
    useState<CapabilityManagementProjection | null>(null);
  const [modes, setModes] = useState<Partial<Record<Capability, OverrideMode>>>(
    {},
  );
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [confirmedHighRisk, setConfirmedHighRisk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await services.admin.getCapabilityOverrides(user.id);
      setProjection(next);
      setModes(
        Object.fromEntries(
          next.capabilities.map((capability) => [
            capability.capability,
            capability.directlyGranted
              ? "grant"
              : capability.directlyRevoked
                ? "revoke"
                : "none",
          ]),
        ),
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.capabilities.loadError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user.id]);

  const baselineModes = useMemo(
    () =>
      new Map(
        (projection?.capabilities ?? []).map(
          (capability) =>
            [
              capability.capability,
              capability.directlyGranted
                ? "grant"
                : capability.directlyRevoked
                  ? "revoke"
                  : "none",
            ] as const,
        ),
      ),
    [projection],
  );
  const changedCapabilities = useMemo(
    () =>
      CAPABILITIES.filter(
        (capability) =>
          (modes[capability] ?? "none") !==
          (baselineModes.get(capability) ?? "none"),
      ),
    [baselineModes, modes],
  );
  const hasHighRiskChange = changedCapabilities.some(
    (capability) =>
      SENSITIVE_CAPABILITY_SET.has(capability) ||
      OWNER_ONLY_CAPABILITY_SET.has(capability),
  );

  const grouped = useMemo(() => {
    const normalized = deferredQuery.trim().toLocaleLowerCase();
    const groups = new Map<
      string,
      NonNullable<CapabilityManagementProjection["capabilities"]>
    >();
    for (const capability of projection?.capabilities ?? []) {
      if (
        normalized &&
        !capability.label.toLocaleLowerCase().includes(normalized) &&
        !capability.capability.toLocaleLowerCase().includes(normalized) &&
        !capability.category.toLocaleLowerCase().includes(normalized)
      ) {
        continue;
      }
      const entries = groups.get(capability.category) ?? [];
      entries.push(capability);
      groups.set(capability.category, entries);
    }
    return [...groups.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [projection, deferredQuery]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmedReason = reason.trim();
    if (
      trimmedReason.length < CAPABILITY_OVERRIDE_REASON_MIN_LENGTH ||
      trimmedReason.length > CAPABILITY_OVERRIDE_REASON_MAX_LENGTH
    ) {
      setError(t("admin.capabilities.reasonError"));
      return;
    }
    if (changedCapabilities.length === 0) {
      setError(t("admin.capabilities.noChanges"));
      return;
    }
    if (hasHighRiskChange && !confirmedHighRisk) {
      setError(t("admin.capabilities.confirmationError"));
      return;
    }
    if (!projection) return;

    setIsSaving(true);
    try {
      await services.admin.updateCapabilityOverrides(user.id, {
        customPermissions: CAPABILITIES.filter(
          (capability) => modes[capability] === "grant",
        ),
        revokedPermissions: CAPABILITIES.filter(
          (capability) => modes[capability] === "revoke",
        ),
        reason: trimmedReason,
        expectedVersion: projection.version,
      });
      await Promise.all([onUpdated(), load()]);
      setReason("");
      setConfirmedHighRisk(false);
      setSuccess(t("admin.capabilities.updateSuccess"));
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.capabilities.updateError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("admin.capabilities.modalTitle", { name: user.name })}
      maxWidth="xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <p
          id="capability-editor-description"
          className="text-xs text-text-secondary"
        >
          {t("admin.capabilities.description")}
        </p>

        {isLoading ? (
          <div
            role="status"
            className="rounded-control border border-border-base bg-bg-base p-5 text-sm text-text-secondary"
          >
            {t("admin.capabilities.loading")}
          </div>
        ) : error && !projection ? (
          <div className="rounded-control border border-danger-border bg-danger-surface p-4">
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              {t("common.retry")}
            </Button>
          </div>
        ) : projection?.capabilities.length === 0 ? (
          <p role="status" className="text-sm text-text-secondary">
            {t("admin.capabilities.empty")}
          </p>
        ) : (
          <>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-text-disabled"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("admin.capabilities.searchLabel")}
                placeholder={t("admin.capabilities.searchPlaceholder")}
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface pl-9 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="max-h-110 space-y-5 overflow-y-auto pr-1">
              {grouped.length === 0 ? (
                <p role="status" className="text-sm text-text-secondary">
                  {t("admin.capabilities.searchEmpty")}
                </p>
              ) : (
                grouped.map(([category, capabilities], groupIndex) => (
                  <section
                    key={category}
                    aria-labelledby={`capability-group-${groupIndex}`}
                  >
                    <h3
                      id={`capability-group-${groupIndex}`}
                      className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-700"
                    >
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {capabilities.map((capability) => {
                        const mode = modes[capability.capability] ?? "none";
                        const ownerOnly = OWNER_ONLY_CAPABILITY_SET.has(
                          capability.capability,
                        );
                        return (
                          <fieldset
                            key={capability.capability}
                            className="rounded-control border border-border-base bg-bg-surface p-3 [contain-intrinsic-size:auto_128px] [content-visibility:auto]"
                          >
                            <legend className="px-1 text-xs font-bold text-text-main">
                              {capability.label}
                            </legend>
                            <code className="text-micro text-stone-500">
                              {capability.capability}
                            </code>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-micro">
                              {capability.fromCustomerAccount && (
                                <span className="rounded-pill bg-stone-100 px-2 py-1 text-stone-700">
                                  {t("admin.capabilities.source.account")}
                                </span>
                              )}
                              {capability.fromStaffRole && (
                                <span className="rounded-pill bg-violet-50 px-2 py-1 text-violet-800">
                                  {t("admin.capabilities.source.staffRole")}
                                </span>
                              )}
                              <span
                                className={`rounded-pill px-2 py-1 font-bold ${
                                  capability.effective
                                    ? "bg-success-surface text-success"
                                    : "bg-stone-100 text-text-secondary"
                                }`}
                              >
                                {capability.effective
                                  ? t("admin.capabilities.effective")
                                  : t("admin.capabilities.ineffective")}
                              </span>
                              {!capability.effective &&
                                capability.ineffectiveReason && (
                                  <span className="px-1 py-1 text-text-secondary">
                                    {t(reasonKey(capability.ineffectiveReason))}
                                  </span>
                                )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                              {(["none", "grant", "revoke"] as const).map(
                                (option) => {
                                  const grantBlocked =
                                    option === "grant" &&
                                    ownerOnly &&
                                    !actorIsOwner;
                                  return (
                                    <label
                                      key={option}
                                      className={`inline-flex items-center gap-1.5 text-xs ${
                                        grantBlocked
                                          ? "cursor-not-allowed text-text-disabled"
                                          : "cursor-pointer text-stone-700"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`override-${capability.capability}`}
                                        value={option}
                                        checked={mode === option}
                                        disabled={grantBlocked}
                                        onChange={() => {
                                          setModes((current) => ({
                                            ...current,
                                            [capability.capability]: option,
                                          }));
                                          setConfirmedHighRisk(false);
                                          setSuccess(null);
                                        }}
                                      />
                                      {t(
                                        `admin.capabilities.mode.${option}` as MessageKey,
                                      )}
                                    </label>
                                  );
                                },
                              )}
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>

            <div className="rounded-control border border-info-border bg-info-surface p-3 text-xs text-info">
              <KeyRound
                className="mr-1 inline h-icon-sm w-icon-sm"
                aria-hidden="true"
              />
              {t("admin.capabilities.scopeNotice")}
            </div>

            <FormField
              label={t("admin.capabilities.reasonLabel")}
              hint={t("admin.capabilities.reasonHint")}
              required
            >
              <Textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={CAPABILITY_OVERRIDE_REASON_MIN_LENGTH}
                maxLength={CAPABILITY_OVERRIDE_REASON_MAX_LENGTH}
              />
            </FormField>

            {hasHighRiskChange && (
              <label className="flex items-start gap-2 rounded-control border border-warning-border bg-warning-surface p-3 text-xs text-warning">
                <input
                  type="checkbox"
                  checked={confirmedHighRisk}
                  onChange={(event) =>
                    setConfirmedHighRisk(event.target.checked)
                  }
                  className="mt-0.5"
                />
                <AlertTriangle
                  className="mt-0.5 h-icon-sm w-icon-sm shrink-0"
                  aria-hidden="true"
                />
                <span>{t("admin.capabilities.highRiskConfirmation")}</span>
              </label>
            )}
          </>
        )}

        {error && projection && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="text-xs font-semibold text-success">
            {success}
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || isSaving || !projection}
          >
            {isSaving
              ? t("common.loading")
              : t("admin.capabilities.saveAction")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
