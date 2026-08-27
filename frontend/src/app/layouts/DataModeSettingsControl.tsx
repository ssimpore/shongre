import React, { useState } from "react";
import {
  Check,
  Database,
  FlaskConical,
  LoaderCircle,
  Settings2,
  ShieldAlert,
} from "lucide-react";

import type { DataMode } from "../../api/client/api-client.config";
import { LiveModeError } from "../../api/client/data-mode.service";
import { Button } from "../../design-system/primitives/Button";
import { Modal } from "../../design-system/primitives/Modal";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { useAuth } from "../providers/AuthProvider";
import { useDataMode } from "../providers/DataModeProvider";
import { allowsLocalDataModeRecovery } from "./data-mode-recovery";

function switchErrorKey(error: unknown): MessageKey {
  if (
    error instanceof LiveModeError &&
    error.code === "LIVE_API_NOT_CONFIGURED"
  ) {
    return "shell.dataMode.liveConfigurationError";
  }
  if (error instanceof LiveModeError && error.code === "LIVE_API_UNAVAILABLE") {
    return "shell.dataMode.liveUnavailableError";
  }
  return "shell.dataMode.switchUnexpectedError";
}

export const DataModeSettingsControl: React.FC = () => {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { mode, isSwitching, liveApiConfigured, selectMode } = useDataMode();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<DataMode>(mode);
  const [error, setError] = useState("");

  const environment = getPublicRuntimeConfig().appEnvironment;
  const localRecovery = allowsLocalDataModeRecovery(mode, environment);
  const authorized = can("admin.configuration.manage") || localRecovery;
  if (!authorized) return null;

  const openSettings = () => {
    setPendingMode(mode);
    setError("");
    setIsOpen(true);
  };

  const applyMode = async () => {
    if (pendingMode === mode) {
      setIsOpen(false);
      return;
    }

    setError("");
    try {
      await selectMode(pendingMode);
    } catch (caught) {
      setError(t(switchErrorKey(caught)));
    }
  };

  const choices: Array<{
    id: DataMode;
    title: string;
    description: string;
    Icon: typeof Database;
  }> = [
    {
      id: "demo",
      title: t("shell.dataMode.demoTitle"),
      description: t("shell.dataMode.demoDescription"),
      Icon: FlaskConical,
    },
    {
      id: "api",
      title: t("shell.dataMode.liveTitle"),
      description: t("shell.dataMode.liveDescription"),
      Icon: Database,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={openSettings}
        aria-label={t("shell.dataMode.openSettings")}
        title={t("shell.dataMode.openSettings")}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-stone-700 bg-stone-800 text-stone-300 transition-colors hover:border-stone-500 hover:bg-stone-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Settings2 className="h-icon-sm w-icon-sm" aria-hidden="true" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        dismissible={!isSwitching}
        title={t("shell.dataMode.settingsTitle")}
        description={t("shell.dataMode.settingsDescription")}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div
            role="radiogroup"
            aria-label={t("shell.dataMode.settingsTitle")}
            className="grid gap-3 sm:grid-cols-2"
          >
            {choices.map(({ id, title, description, Icon }) => {
              const selected = pendingMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={isSwitching}
                  onClick={() => {
                    setPendingMode(id);
                    setError("");
                  }}
                  className={`relative rounded-card border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70 ${
                    selected
                      ? "border-primary bg-primary-light"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
                        selected
                          ? "bg-primary text-white"
                          : "bg-bg-subtle text-text-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-bold text-text-main">
                        {title}
                        {mode === id ? (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-micro font-semibold text-stone-600">
                            {t("shell.dataMode.active")}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
                        {description}
                      </span>
                    </span>
                  </span>
                  {selected ? (
                    <Check
                      className="absolute right-3 top-3 h-icon-md w-icon-md text-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {pendingMode === "api" && pendingMode !== mode ? (
            <div className="rounded-card border border-warning-border bg-warning-surface p-4 text-sm text-warning">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 h-icon-lg w-icon-lg shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-bold">
                    {t("shell.dataMode.liveConfirmationTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {t("shell.dataMode.liveConfirmationDescription")}
                  </p>
                  {!liveApiConfigured ? (
                    <p className="mt-2 text-xs font-bold">
                      {t("shell.dataMode.liveNotConfigured")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-card border border-danger-border bg-danger-surface p-3 text-sm font-semibold text-danger"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSwitching}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => void applyMode()}
              disabled={isSwitching || pendingMode === mode}
            >
              {isSwitching ? (
                <LoaderCircle
                  className="h-icon-md w-icon-md animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {pendingMode === "api"
                ? t("shell.dataMode.confirmLive")
                : t("shell.dataMode.confirmDemo")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
