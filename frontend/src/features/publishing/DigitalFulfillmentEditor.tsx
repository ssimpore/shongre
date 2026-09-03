import React, { useEffect, useMemo, useState } from "react";
import {
  DIGITAL_PROVISIONING_TIME_MAX_HOURS,
  DIGITAL_PROVISIONING_TIME_MIN_HOURS,
  type CredentialKind,
  type DigitalAssetProjection,
  type DigitalFulfillmentType,
  type DigitalFulfillmentVersionInput,
  type DigitalPolicyProjection,
  type DigitalSellerProfile,
} from "@shongre/contracts/digital-products";
import {
  FileKey2,
  KeyRound,
  Link2,
  Package,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { Badge } from "../../design-system/primitives/Badge";
import { useTranslation } from "../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../i18n/digital.catalogue.fr";

interface DigitalFulfillmentEditorProps {
  marketCode: string;
  sellerId?: string;
  value?: DigitalFulfillmentVersionInput;
  onChange: (value: DigitalFulfillmentVersionInput | undefined) => void;
}

const MODE_OPTIONS: Array<{
  id:
    | "PHYSICAL"
    | "FILE_DOWNLOAD"
    | "ACCESS_LINK"
    | "ACCESS_CREDENTIALS"
    | "SELLER_PROVISIONED"
    | "LINK_AND_CREDENTIALS";
  required: DigitalFulfillmentType[];
  labelKey:
    | "digital.fulfillment.physical"
    | "digital.fulfillment.file"
    | "digital.fulfillment.link"
    | "digital.fulfillment.credentials"
    | "digital.fulfillment.provisioned"
    | "digital.fulfillment.combined";
  Icon: typeof Package;
}> = [
  {
    id: "PHYSICAL",
    required: [],
    labelKey: "digital.fulfillment.physical",
    Icon: Package,
  },
  {
    id: "FILE_DOWNLOAD",
    required: ["FILE_DOWNLOAD"],
    labelKey: "digital.fulfillment.file",
    Icon: Upload,
  },
  {
    id: "ACCESS_LINK",
    required: ["ACCESS_LINK"],
    labelKey: "digital.fulfillment.link",
    Icon: Link2,
  },
  {
    id: "ACCESS_CREDENTIALS",
    required: ["ACCESS_CREDENTIALS"],
    labelKey: "digital.fulfillment.credentials",
    Icon: KeyRound,
  },
  {
    id: "SELLER_PROVISIONED",
    required: ["SELLER_PROVISIONED"],
    labelKey: "digital.fulfillment.provisioned",
    Icon: ShieldCheck,
  },
  {
    id: "LINK_AND_CREDENTIALS",
    required: ["ACCESS_LINK", "ACCESS_CREDENTIALS"],
    labelKey: "digital.fulfillment.combined",
    Icon: FileKey2,
  },
];

const lines = (value: string) =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const DigitalFulfillmentEditor: React.FC<
  DigitalFulfillmentEditorProps
> = ({ marketCode, sellerId, value, onChange }) => {
  const { t } = useTranslation(digitalMessagesFr);
  const [policy, setPolicy] = useState<DigitalPolicyProjection | null>(null);
  const [profile, setProfile] = useState<DigitalSellerProfile | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [assets, setAssets] = useState<DigitalAssetProjection[]>([]);
  const [actionState, setActionState] = useState<"idle" | "working" | "error">(
    "idle",
  );
  const [destinationUrl, setDestinationUrl] = useState("");
  const [displayDomain, setDisplayDomain] = useState("");
  const [username, setUsername] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [instructions, setInstructions] = useState("");
  const [inventoryText, setInventoryText] = useState("");
  const [inventoryCount, setInventoryCount] = useState(0);
  const [accessClass, setAccessClass] = useState("");

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    Promise.all([
      services.digitalProducts.getPolicy(marketCode),
      sellerId
        ? services.digitalProducts.getSellerProfile(marketCode, sellerId)
        : Promise.resolve(null),
    ])
      .then(([nextPolicy, nextProfile]) => {
        if (!active) return;
        setPolicy(nextPolicy);
        setProfile(nextProfile);
        setAccessClass(nextPolicy.credentialInventory.allowedClasses[0] ?? "");
        setLoadState("ready");
      })
      .catch(() => active && setLoadState("error"));
    return () => {
      active = false;
    };
  }, [marketCode, sellerId]);

  useEffect(() => {
    let active = true;
    const ids = value?.privateAssetVersionIds ?? [];
    if (!ids.length) {
      setAssets([]);
      return () => {
        active = false;
      };
    }
    Promise.all(
      ids.map((id) => services.digitalProducts.getAsset(marketCode, id)),
    )
      .then((items) => active && setAssets(items))
      .catch(() => active && setAssets([]));
    return () => {
      active = false;
    };
  }, [marketCode, value?.privateAssetVersionIds]);

  const selectedMode = useMemo(() => {
    if (!value) return "PHYSICAL";
    if (
      value.fulfillmentTypes.includes("ACCESS_LINK") &&
      value.fulfillmentTypes.includes("ACCESS_CREDENTIALS")
    )
      return "LINK_AND_CREDENTIALS";
    return value.primaryFulfillmentType;
  }, [value]);

  const digitalAllowed = Boolean(
    policy?.enabled &&
    profile?.status === "ACTIVE" &&
    profile.policyVersion === policy.version,
  );
  const availableOptions = MODE_OPTIONS.filter(
    (option) =>
      option.id === "PHYSICAL" ||
      (digitalAllowed &&
        option.required.every((type) =>
          policy?.allowedFulfillmentTypes.includes(type),
        ) &&
        policy?.allowedFulfillmentCombinations.some(
          (combination) =>
            combination.length === option.required.length &&
            option.required.every((type) => combination.includes(type)),
        )),
  );

  const selectMode = (option: (typeof MODE_OPTIONS)[number]) => {
    setActionState("idle");
    setAssets([]);
    setInventoryCount(0);
    if (option.id === "PHYSICAL") {
      onChange(undefined);
      return;
    }
    const types = option.required;
    onChange({
      fulfillmentTypes: types,
      primaryFulfillmentType: types[0],
      productVersion: "1.0",
      buyerFacingDescription: "",
      productAccessClass: types.some((type) => type !== "FILE_DOWNLOAD")
        ? accessClass || undefined
        : undefined,
      compatibility: [],
      requirements: [],
      privateAssetVersionIds: [],
      credentialBatchIds: [],
      credentialKinds: types.includes("ACCESS_CREDENTIALS")
        ? ["USERNAME", "PASSWORD"]
        : [],
      credentialAllocationMode: types.includes("ACCESS_CREDENTIALS")
        ? "REUSABLE"
        : undefined,
      provisioningTimeHours: types.includes("SELLER_PROVISIONED")
        ? 24
        : undefined,
    });
  };

  const patchValue = (next: Partial<DigitalFulfillmentVersionInput>) => {
    if (value) onChange({ ...value, ...next });
  };

  const uploadFile = async (file: File) => {
    if (!value) return;
    setActionState("working");
    try {
      const completed = await services.digitalProducts.uploadPrivateFile(
        marketCode,
        file,
      );
      setAssets((current) => [
        ...current.filter((asset) => asset.id !== completed.id),
        completed,
      ]);
      patchValue({
        privateAssetVersionIds: [
          ...new Set([...value.privateAssetVersionIds, completed.id]),
        ],
      });
      setActionState("idle");
    } catch {
      setActionState("error");
    }
  };

  const protectAccess = async () => {
    if (!value || !accessClass) return;
    setActionState("working");
    try {
      const fields: Array<{
        kind: CredentialKind;
        label: string;
        value: string;
      }> = [];
      if (value.fulfillmentTypes.includes("ACCESS_CREDENTIALS")) {
        if (username.trim())
          fields.push({
            kind: "USERNAME",
            label: t("digital.fulfillment.username"),
            value: username.trim(),
          });
        if (secretValue)
          fields.push({
            kind: "PASSWORD",
            label: t("digital.fulfillment.password"),
            value: secretValue,
          });
      }
      const protectedAccess =
        await services.digitalProducts.createProtectedAccess(marketCode, {
          productAccessClass: accessClass,
          destinationUrl: destinationUrl || undefined,
          displayDomain: displayDomain || undefined,
          fields,
          instructions: instructions || undefined,
        });
      patchValue({
        productAccessClass: accessClass,
        accessSecretVersionId: protectedAccess.id,
        credentialAllocationMode: value.fulfillmentTypes.includes(
          "ACCESS_CREDENTIALS",
        )
          ? "REUSABLE"
          : undefined,
        credentialKinds: fields.map((field) => field.kind),
        credentialBatchIds: [],
      });
      setDestinationUrl("");
      setUsername("");
      setSecretValue("");
      setInstructions("");
      setActionState("idle");
    } catch {
      setActionState("error");
    }
  };

  const importInventory = async () => {
    if (!value || !accessClass || !inventoryText.trim()) return;
    setActionState("working");
    try {
      const batch = await services.digitalProducts.createCredentialBatch(
        marketCode,
        {
          productAccessClass: accessClass,
          allocationMode: "UNIQUE_INVENTORY",
          credentialKinds: ["LICENSE_KEY"],
        },
      );
      const inventory =
        await services.digitalProducts.importCredentialInventory(
          marketCode,
          batch.id,
          {
            productAccessClass: accessClass,
            credentials: lines(inventoryText).map((key) => ({
              fields: [
                {
                  kind: "LICENSE_KEY",
                  label: t("digital.fulfillment.password"),
                  value: key,
                },
              ],
            })),
          },
        );
      setInventoryText("");
      setInventoryCount(inventory.availableCount);
      patchValue({
        productAccessClass: accessClass,
        accessSecretVersionId: undefined,
        credentialAllocationMode: "UNIQUE_INVENTORY",
        credentialKinds: ["LICENSE_KEY"],
        credentialBatchIds: [batch.id],
      });
      setActionState("idle");
    } catch {
      setActionState("error");
    }
  };

  if (loadState === "loading")
    return <p role="status">{t("digital.common.loading")}</p>;
  if (loadState === "error")
    return <p role="alert">{t("digital.common.error")}</p>;

  return (
    <section
      className="space-y-5"
      aria-labelledby="digital-fulfillment-heading"
    >
      <div>
        <h3
          id="digital-fulfillment-heading"
          className="text-lg font-bold text-stone-900"
        >
          {t("digital.fulfillment.heading")}
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          {t("digital.fulfillment.description")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {availableOptions.map((option) => {
          const active = selectedMode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectMode(option)}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "border-primary bg-primary-light" : "border-border-base bg-white hover:bg-stone-50"}`}
            >
              <option.Icon className="mb-2 h-5 w-5" aria-hidden="true" />
              <span className="block text-sm font-bold">
                {t(option.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      {!policy?.enabled ? (
        <p role="status" className="rounded-lg bg-warning-surface p-3 text-sm">
          {t("digital.fulfillment.policyDisabled")}
        </p>
      ) : null}
      {policy?.enabled && !digitalAllowed ? (
        <p role="status" className="rounded-lg bg-warning-surface p-3 text-sm">
          {t("digital.fulfillment.profileRequired")}
        </p>
      ) : null}

      {value ? (
        <div className="space-y-4 rounded-xl border border-border-base bg-bg-base/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("digital.fulfillment.productVersion")} required>
              <Input
                value={value.productVersion}
                onChange={(event) =>
                  patchValue({ productVersion: event.target.value })
                }
              />
            </FormField>
            {value.fulfillmentTypes.includes("SELLER_PROVISIONED") ? (
              <FormField
                label={t("digital.fulfillment.provisioningHours")}
                required
              >
                <Input
                  type="number"
                  min={DIGITAL_PROVISIONING_TIME_MIN_HOURS}
                  max={
                    policy?.provisioningDeadlineHours ??
                    DIGITAL_PROVISIONING_TIME_MAX_HOURS
                  }
                  value={value.provisioningTimeHours ?? ""}
                  onChange={(event) =>
                    patchValue({
                      provisioningTimeHours:
                        Number(event.target.value) || undefined,
                    })
                  }
                />
              </FormField>
            ) : null}
          </div>
          <FormField
            label={t("digital.fulfillment.receivedDescription")}
            required
          >
            <Textarea
              value={value.buyerFacingDescription}
              onChange={(event) =>
                patchValue({ buyerFacingDescription: event.target.value })
              }
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("digital.fulfillment.compatibility")}>
              <Textarea
                value={value.compatibility.join("\n")}
                onChange={(event) =>
                  patchValue({ compatibility: lines(event.target.value) })
                }
              />
            </FormField>
            <FormField label={t("digital.fulfillment.requirements")}>
              <Textarea
                value={value.requirements.join("\n")}
                onChange={(event) =>
                  patchValue({ requirements: lines(event.target.value) })
                }
              />
            </FormField>
          </div>

          {value.fulfillmentTypes.includes("FILE_DOWNLOAD") ? (
            <div className="space-y-3">
              <label
                className="block text-sm font-semibold"
                htmlFor="digital-private-file"
              >
                {t("digital.fulfillment.privateFile")}
              </label>
              <input
                id="digital-private-file"
                type="file"
                accept={policy?.allowedFileExtensions.join(",")}
                disabled={actionState === "working"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                  event.currentTarget.value = "";
                }}
                className="block w-full rounded-control border border-border-base bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm"
                >
                  <span className="min-w-0 truncate">{asset.safeFileName}</span>
                  <Badge>{asset.status}</Badge>
                </div>
              ))}
            </div>
          ) : null}

          {value.fulfillmentTypes.some(
            (type) => type === "ACCESS_LINK" || type === "ACCESS_CREDENTIALS",
          ) ? (
            <div className="space-y-3 rounded-lg bg-white p-4">
              <FormField label={t("digital.fulfillment.accessClass")} required>
                <select
                  value={accessClass}
                  onChange={(event) => {
                    setAccessClass(event.target.value);
                    patchValue({ productAccessClass: event.target.value });
                  }}
                  className="w-full rounded-control border border-border-base bg-white p-3 text-sm h-control-touch"
                >
                  {(policy?.credentialInventory.allowedClasses ?? []).map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label={t("digital.fulfillment.linkLabel")}
                  required={value.fulfillmentTypes.includes("ACCESS_LINK")}
                >
                  <Input
                    type="url"
                    autoComplete="off"
                    value={destinationUrl}
                    onChange={(event) => setDestinationUrl(event.target.value)}
                  />
                </FormField>
                <FormField label={t("digital.fulfillment.displayDomain")}>
                  <Input
                    autoComplete="off"
                    value={displayDomain}
                    onChange={(event) => setDisplayDomain(event.target.value)}
                  />
                </FormField>
              </div>
              {value.fulfillmentTypes.includes("ACCESS_CREDENTIALS") ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={t("digital.fulfillment.username")}>
                    <Input
                      autoComplete="off"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </FormField>
                  <FormField label={t("digital.fulfillment.password")} required>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={secretValue}
                      onChange={(event) => setSecretValue(event.target.value)}
                    />
                  </FormField>
                </div>
              ) : null}
              <FormField label={t("digital.fulfillment.requirements")}>
                <Textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </FormField>
              <Button
                type="button"
                onClick={() => void protectAccess()}
                disabled={actionState === "working"}
              >
                {value.accessSecretVersionId
                  ? t("digital.fulfillment.protected")
                  : t("digital.fulfillment.protect")}
              </Button>

              {value.fulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
              !value.fulfillmentTypes.includes("ACCESS_LINK") ? (
                <div className="space-y-2 border-t border-border-subtle pt-4">
                  <FormField label={t("digital.fulfillment.uniqueInventory")}>
                    <Textarea
                      autoComplete="off"
                      value={inventoryText}
                      onChange={(event) => setInventoryText(event.target.value)}
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void importInventory()}
                    disabled={actionState === "working"}
                  >
                    {t("digital.fulfillment.importInventory")}
                  </Button>
                  {inventoryCount > 0 ? (
                    <p role="status" className="text-sm text-success">
                      {t("digital.fulfillment.inventoryReady", {
                        count: inventoryCount,
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {value.fulfillmentTypes.includes("SELLER_PROVISIONED") ? (
            <div className="rounded-lg bg-white p-4">
              <FormField label={t("digital.fulfillment.accessClass")} required>
                <select
                  value={value.productAccessClass ?? accessClass}
                  onChange={(event) => {
                    setAccessClass(event.target.value);
                    patchValue({ productAccessClass: event.target.value });
                  }}
                  className="w-full rounded-control border border-border-base bg-white p-3 text-sm h-control-touch"
                >
                  {(policy?.credentialInventory.allowedClasses ?? []).map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </FormField>
            </div>
          ) : null}

          {actionState === "working" ? (
            <p role="status" aria-live="polite">
              {t("digital.fulfillment.uploading")}
            </p>
          ) : null}
          {actionState === "error" ? (
            <p role="alert" className="text-danger">
              {t("digital.common.error")}
            </p>
          ) : null}
          {value.buyerFacingDescription.length >= 10 ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {t("digital.fulfillment.ready")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
