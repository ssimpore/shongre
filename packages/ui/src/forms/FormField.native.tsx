import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import {
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { Text } from "../primitives/Typography.native";

export interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}
export function FormField({
  label,
  error,
  hint,
  required,
  style,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={styles.group}>
      <Text size="label-md" weight="semibold">
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={error || hint}
        accessibilityState={{ disabled: !inputProps.editable }}
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={nativeColors.text.muted}
      />
      {error ? (
        <Text accessibilityRole="alert" size="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text size="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
export const Input = FormField;
const styles = StyleSheet.create({
  group: { gap: nativeSpacing.xs },
  input: {
    minHeight: nativeSizing.controlTouch,
    borderWidth: 1,
    borderColor: nativeColors.border.default,
    borderRadius: nativeRadius.control,
    backgroundColor: nativeColors.surface.raised,
    paddingHorizontal: nativeSpacing.md,
    color: nativeColors.text.primary,
    fontFamily: nativeTypography.fontFamily.regular,
    fontSize: nativeTypography.size.body,
  },
  multiline: {
    minHeight: 112,
    paddingTop: nativeSpacing.md,
    textAlignVertical: "top",
  },
  inputError: { borderColor: nativeColors.status.error },
});
