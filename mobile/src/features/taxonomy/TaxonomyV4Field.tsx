import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TaxonomyV4ResolvedSchema } from "@shongre/contracts/taxonomy";
import { resolveTaxonomyControl } from "@shongre/features";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

type ResolvedAttribute = TaxonomyV4ResolvedSchema["attributes"][number];

export interface TaxonomyV4FieldProps {
  field: ResolvedAttribute;
  locale: string;
  value: unknown;
  disabled?: boolean;
  state?: "ready" | "loading" | "empty" | "error";
  error?: string;
  onRetry?: () => void;
  onChange: (value: unknown) => void;
}

const localized = (
  labels: Record<string, string | undefined>,
  locale: string,
) => labels[locale] ?? labels["fr-FR"] ?? "";

export function TaxonomyV4Field({
  field,
  locale,
  value,
  disabled = false,
  state = "ready",
  error,
  onRetry,
  onChange,
}: TaxonomyV4FieldProps) {
  const { definition, binding, options } = field;
  const control = resolveTaxonomyControl(definition);
  const label = localized(definition.labels, locale);
  const hint = localized(definition.helpText, locale);

  if (control.kind === "hidden") return null;
  if (state === "loading") {
    return (
      <View accessibilityRole="progressbar" style={styles.statusRow}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.hint}>Chargement de « {label} »…</Text>
      </View>
    );
  }
  if (state === "error") {
    return (
      <View accessibilityRole="alert" style={styles.errorBox}>
        <Text style={styles.errorText}>
          {error ?? `Impossible de charger « ${label} ».`}
        </Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (control.requiresOptions && options.length === 0 && state === "empty") {
    return (
      <Text accessibilityRole="text" style={styles.hint}>
        Aucune option disponible pour « {label} ».
      </Text>
    );
  }
  if (control.kind === "readonly") {
    return (
      <View style={styles.group}>
        <Text style={styles.label}>{label}</Text>
        <Text selectable style={styles.readonly}>
          {String(value ?? "")}
        </Text>
      </View>
    );
  }
  if (control.kind === "boolean") {
    return (
      <View style={styles.switchRow}>
        <View style={styles.textColumn}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <Switch
          accessibilityLabel={label}
          disabled={disabled}
          value={Boolean(value)}
          onValueChange={onChange}
        />
      </View>
    );
  }
  if (
    (control.kind === "single_choice" ||
      control.kind === "multiple_choice" ||
      control.kind === "autocomplete" ||
      control.kind === "cascade") &&
    options.length > 0
  ) {
    const selected = Array.isArray(value)
      ? value.map(String)
      : [String(value ?? "")];
    return (
      <View style={styles.group} accessibilityRole="radiogroup">
        <Text style={styles.label}>
          {label}
          {binding.required ? " *" : ""}
        </Text>
        <View style={styles.choiceRow}>
          {options.map((option) => {
            const checked = selected.includes(option.key);
            return (
              <Pressable
                key={option.id}
                accessibilityRole={control.multiple ? "checkbox" : "radio"}
                accessibilityState={{ checked, disabled }}
                disabled={disabled}
                onPress={() =>
                  onChange(
                    control.multiple
                      ? checked
                        ? selected.filter((item) => item !== option.key)
                        : [...selected.filter(Boolean), option.key]
                      : option.key,
                  )
                }
                style={[styles.choice, checked && styles.choiceSelected]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    checked && styles.choiceTextSelected,
                  ]}
                >
                  {localized(option.labels, locale)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  if (control.kind === "media" || control.kind === "document") {
    return (
      <View style={styles.group} accessibilityState={{ disabled: true }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>
          Ce champ utilise le sélecteur sécurisé de l’application.
        </Text>
      </View>
    );
  }

  const keyboardType =
    control.kind === "number"
      ? "decimal-pad"
      : definition.dataType === "email"
        ? "email-address"
        : definition.dataType === "phone"
          ? "phone-pad"
          : "default";
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {binding.required ? " *" : ""}
      </Text>
      <TextInput
        accessibilityLabel={label}
        editable={!disabled}
        multiline={control.kind === "long_text"}
        keyboardType={keyboardType}
        value={String(value ?? "")}
        placeholder={localized(definition.placeholder, locale)}
        placeholderTextColor={colors.textMuted}
        onChangeText={(next) =>
          onChange(
            control.kind === "number" && next !== "" ? Number(next) : next,
          )
        }
        style={[styles.input, control.kind === "long_text" && styles.multiline]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  hint: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
  },
  input: {
    minHeight: nativeSizing.controlTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: { minHeight: 112, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  errorBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  errorText: { color: colors.danger, fontSize: nativeTypography.size.bodySm },
  retryButton: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
  },
  retryText: {
    color: colors.danger,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  textColumn: { flex: 1, gap: spacing.xs },
  readonly: {
    minHeight: nativeSizing.controlTouch,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  choiceText: { color: colors.text, fontSize: nativeTypography.size.bodySm },
  choiceTextSelected: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
});
