import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import {
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_COMMENT_MIN_LENGTH,
  reviewsService,
  type MobileReviewEligibility,
} from "@/features/reviews/reviews.service";

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * The transaction review, collected after a completed order with the same
 * rule the Web order page applies: one review per order, by a participant.
 */
export default function OrderReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [retryVersion, setRetryVersion] = useState(0);
  const requestKey = `${id ?? ""} ${retryVersion}`;
  // Loading is derived from which request last answered, so the effect only
  // ever sets state from the response callbacks.
  const [result, setResult] = useState<{
    key: string;
    eligibility: MobileReviewEligibility | null;
    error: boolean;
  }>({ key: "", eligibility: null, error: false });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    reviewsService
      .eligibility(id)
      .then((eligibility) => {
        if (!cancelled)
          setResult({ key: requestKey, eligibility, error: false });
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: requestKey, eligibility: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id, requestKey]);

  const state: "loading" | "error" | "ready" =
    result.key !== requestKey ? "loading" : result.error ? "error" : "ready";
  const eligibility = state === "ready" ? result.eligibility : null;
  const trimmed = comment.trim();
  const canSubmit =
    rating > 0 &&
    trimmed.length >= REVIEW_COMMENT_MIN_LENGTH &&
    trimmed.length <= REVIEW_COMMENT_MAX_LENGTH &&
    !submitting;

  const submit = async () => {
    if (!id || !canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await reviewsService.submit({ orderId: id, rating, comment: trimmed });
      setSubmitted(true);
    } catch (reason) {
      setSubmitError(
        reason instanceof Error && reason.message
          ? reason.message
          : "L’avis n’a pas pu être envoyé.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Laisser un avis" }} />
      <Text accessibilityRole="header" style={styles.heading}>
        Votre avis sur cette transaction
      </Text>
      {state === "loading" ? (
        <Text style={styles.muted} accessibilityLiveRegion="polite">
          Vérification de la commande…
        </Text>
      ) : state === "error" ? (
        <StatePanel
          title="Commande indisponible"
          message="La commande n’a pas pu être vérifiée."
          tone="error"
          actionLabel="Réessayer"
          onAction={() => setRetryVersion((version) => version + 1)}
        />
      ) : submitted ? (
        <StatePanel
          title="Merci pour votre avis"
          message="Il apparaît sur le profil public de l’autre membre."
          actionLabel="Retour aux commandes"
          onAction={() => router.back()}
        />
      ) : eligibility?.eligible ? (
        <>
          <Text style={styles.muted}>
            Un avis par commande terminée. Il est public et signé de votre
            prénom.
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Note sur 5"
            style={styles.stars}
          >
            {RATINGS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${value} sur 5`}
                accessibilityState={{ checked: rating === value }}
                onPress={() => setRating(value)}
                style={styles.star}
              >
                <Text
                  style={[
                    styles.starGlyph,
                    value <= rating ? styles.starSelected : null,
                  ]}
                >
                  {value <= rating ? "★" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>
          <FormField
            label="Votre commentaire"
            required
            multiline
            numberOfLines={5}
            value={comment}
            onChangeText={setComment}
            maxLength={REVIEW_COMMENT_MAX_LENGTH}
            hint={`${trimmed.length} / ${REVIEW_COMMENT_MAX_LENGTH} caractères, ${REVIEW_COMMENT_MIN_LENGTH} au minimum.`}
            error={submitError}
            placeholder="Ponctualité, état de l’objet, échanges…"
            style={styles.comment}
          />
          <Button
            label="Publier mon avis"
            onPress={submit}
            loading={submitting}
            disabled={!canSubmit}
          />
        </>
      ) : (
        <StatePanel
          title={
            eligibility?.reason === "ALREADY_REVIEWED"
              ? "Avis déjà publié"
              : "Commande non terminée"
          }
          message={
            eligibility?.reason === "ALREADY_REVIEWED"
              ? `Vous avez déjà noté cette transaction${
                  eligibility.submittedRating
                    ? ` (${eligibility.submittedRating} sur 5)`
                    : ""
                }.`
              : "Un avis se laisse une fois la commande terminée, après la remise."
          }
          actionLabel="Retour aux commandes"
          onAction={() => router.back()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  stars: { flexDirection: "row", gap: spacing.xs },
  star: {
    minWidth: nativeSizing.controlTouch,
    minHeight: nativeSizing.controlTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  starGlyph: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.headingLg,
  },
  starSelected: { color: colors.warning },
  comment: { minHeight: nativeSizing.fieldMultilineMin },
});
