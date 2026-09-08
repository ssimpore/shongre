import React, { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import {
  Input,
  Textarea,
  FormField,
} from "../../design-system/primitives/FormField";
import { Avatar } from "../../design-system/primitives/Badge";
import { Check, Building2, MapPin, Globe, Phone } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { Link } from "react-router-dom";
import { routes } from "../../configuration/routes";

export const ProStorefrontEditorPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.proStorefrontEditor.title"),
    description: t("meta.proStorefrontEditor.description"),
    canonicalPath: "/compte/pro/vitrine",
    noIndex: true,
  });

  const { currentUser, updateProfile } = useAuth();
  const toast = useToast();

  const companyName = currentUser?.companyName || "";
  const siret = currentUser?.sirenSiret || currentUser?.siret || "";
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [city, setCity] = useState(currentUser?.city || "");
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      bio,
      city,
      postalCode,
      phone,
    });
    toast.success(
      "La présentation et les coordonnées de votre profil ont été enregistrées.",
    );
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-bg-surface rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs"
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-main">
          Personnaliser ma vitrine professionnelle
        </h1>
        <p className="text-xs sm:text-sm text-text-tertiary mt-0.5">
          {t(
            "sellerworkspace.proStorefrontEditorPage.cesInformationsSontAfficheesSur",
          )}
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-text-emphasis uppercase tracking-wider block">
          {t(
            "sellerworkspace.proStorefrontEditorPage.banniereLogoDeLaBoutique",
          )}
        </label>
        <div className="relative h-32 rounded-xl bg-gradient-to-r from-surface-inverse-hover to-surface-inverse flex items-end p-4 border border-border-base">
          <div className="flex items-center gap-3">
            <Avatar
              src={currentUser?.avatarUrl}
              name={companyName}
              size="lg"
              isVerified={currentUser?.isVerified === true}
              className="ring-2 ring-border-on-inverse"
            />
            <div className="text-text-inverse">
              <div className="font-bold text-sm">{companyName}</div>
              <div className="text-xs text-text-inverse-muted">
                Boutique officielle Shongre Pro
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Raison sociale / Nom commercial" required>
          <Input
            value={companyName}
            readOnly
            placeholder="Non renseigné"
            leftIcon={<Building2 className="w-icon-md h-icon-md" />}
          />
        </FormField>

        <FormField
          label={t(
            "sellerworkspace.proStorefrontEditorPage.numeroSiret14Chiffres",
          )}
          required
          hint="Les données légales vérifiées se modifient depuis le parcours de vérification."
        >
          <Input value={siret} readOnly placeholder="Non renseigné" />
        </FormField>
      </div>

      <FormField
        label={t(
          "sellerworkspace.proStorefrontEditorPage.presentationDeLEntrepriseSavoir",
        )}
        required
        hint="Décrivez vos garanties, vos conditions de retour, votre expertise."
      >
        <Textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Code Postal" required>
          <Input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </FormField>

        <FormField label="Ville" required>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            leftIcon={<MapPin className="w-icon-md h-icon-md" />}
          />
        </FormField>
      </div>

      <FormField
        label={t("sellerworkspace.proStorefrontEditorPage.telephoneCommercial")}
      >
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<Phone className="w-icon-md h-icon-md" />}
        />
      </FormField>

      <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
        <Link
          to={routes.seller.storefront(
            currentUser?.storeSlug || currentUser?.id || "",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
        >
          <Globe className="w-icon-md h-icon-md" />
          <span>
            {t("sellerworkspace.proStorefrontEditorPage.voirMaVitrineEnDirect")}
          </span>
        </Link>

        {/* `size="lg"` + a nowrap label is 286px wide, which alone overflows a
            320px viewport. Full-width below `sm` is the platform idiom for a
            form's primary action and removes the overflow at its source. */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          leftIcon={<Check className="w-icon-md h-icon-md" />}
          className="w-full sm:w-auto"
        >
          {t(
            "sellerworkspace.proStorefrontEditorPage.enregistrerLesModifications",
          )}
        </Button>
      </div>
    </form>
  );
};
