import { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { publicationInputSchema } from "@shongre/contracts";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { listingsService } from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";
import { permissionsService } from "@/services/permissions/permissions.service";

const categories = [
  { id: "vehicles-bikes", label: "Vélos" },
  { id: "home-furniture", label: "Maison" },
  { id: "electronics-photo", label: "Photo & électronique" },
] as const;

export default function PublishScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0].id);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const choosePhoto = async () => {
    const outcome = await permissionsService.requestPhotoSelection();
    if (outcome !== "granted") {
      Alert.alert(
        "Accès aux photos refusé",
        "Vous pouvez continuer sans photo ou autoriser l’accès dans les réglages du téléphone.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled)
      setImages((current) => [...current, result.assets[0].uri].slice(0, 12));
  };

  const publish = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const numericPrice = Number(price.replace(",", "."));
    const parsed = publicationInputSchema.safeParse({
      title,
      description,
      amountMinor: Math.round(numericPrice * 100),
      currency: activeMarket.currency,
      categoryId,
      marketCode: activeMarket.code,
      city,
      postalCode,
      condition: "Bon état",
      images,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message || "Vérifiez les informations saisies.",
      );
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const listing = await listingsService.publish(parsed.data);
      Alert.alert(
        "Annonce envoyée",
        "Votre annonce est publiée ou en cours de vérification selon les contrôles de sécurité.",
        [
          {
            text: "Voir l’annonce",
            onPress: () => router.replace(`/listing/${listing.id}`),
          },
        ],
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Publication impossible.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.heading}>
          Publier une annonce
        </Text>
        <Text style={styles.subtitle}>
          Ajoutez l’essentiel maintenant. Vous pourrez compléter les détails
          depuis votre espace vendeur.
        </Text>
      </View>

      <View style={styles.categoryGroup} accessibilityRole="radiogroup">
        <Text style={styles.label}>Catégorie</Text>
        <View style={styles.categoryRow}>
          {categories.map((category) => (
            <Button
              key={category.id}
              label={category.label}
              variant={categoryId === category.id ? "primary" : "secondary"}
              onPress={() => setCategoryId(category.id)}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </View>

      <FormField
        label="Titre"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Décrivez précisément l’objet"
      />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
        placeholder="État, dimensions, accessoires, défauts…"
      />
      <FormField
        label={`Prix en ${activeMarket.currencySymbol ?? activeMarket.currency}`}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="0,00"
      />
      <FormField label="Ville" value={city} onChangeText={setCity} />
      <FormField
        label="Code postal"
        value={postalCode}
        onChangeText={setPostalCode}
        keyboardType="number-pad"
        autoComplete="postal-code"
      />

      {images[0] ? (
        <Image source={{ uri: images[0] }} style={styles.preview} />
      ) : null}
      <Button
        label={
          images.length
            ? `Ajouter une photo (${images.length}/12)`
            : "Choisir une photo"
        }
        onPress={choosePhoto}
        variant="secondary"
      />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={user ? "Publier l’annonce" : "Se connecter pour publier"}
        onPress={publish}
        loading={publishing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  label: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  categoryGroup: { gap: spacing.sm },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryButton: { minHeight: nativeSizing.controlTouch },
  preview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
