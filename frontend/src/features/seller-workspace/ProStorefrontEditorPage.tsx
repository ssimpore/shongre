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

  const [companyName, setCompanyName] = useState(
    currentUser?.companyName || "Atelier Nordique SAS",
  );
  const [siret, setSiret] = useState(
    currentUser?.sirenSiret || currentUser?.siret || "842 194 883 00019",
  );
  const [bio, setBio] = useState(
    currentUser?.bio ||
      "Spécialiste du mobilier scandinave et vintage certifié.",
  );
  const [address, setAddress] = useState("14 rue du Faubourg Saint-Antoine");
  const [city, setCity] = useState(currentUser?.city || "Paris");
  const [postalCode, setPostalCode] = useState(
    currentUser?.postalCode || "75011",
  );
  const [phone, setPhone] = useState(currentUser?.phone || "01 42 68 90 12");
  const [website, setWebsite] = useState(
    currentUser?.websiteUrl || "https://atelier-nordique.fr",
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      companyName,
      sirenSiret: siret,
      siret: siret,
      bio,
      city,
      postalCode,
      phone,
      websiteUrl: website,
    });
    toast.success(
      "Les informations de votre vitrine pro ont été enregistrées.",
    );
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs"
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900">
          Personnaliser ma vitrine professionnelle
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          {t(
            "sellerworkspace.proStorefrontEditorPage.cesInformationsSontAfficheesSur",
          )}
        </p>
      </div>

      {/* Banner & Logo simulation */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          {t(
            "sellerworkspace.proStorefrontEditorPage.banniereLogoDeLaBoutique",
          )}
        </label>
        <div className="relative h-32 rounded-xl bg-gradient-to-r from-stone-800 to-stone-900 flex items-end p-4 border border-border-base">
          <div className="flex items-center gap-3">
            <Avatar
              src={currentUser?.avatarUrl}
              name={companyName}
              size="lg"
              isVerified={true}
              isPro={true}
              className="ring-2 ring-white"
            />
            <div className="text-white">
              <div className="font-bold text-sm">{companyName}</div>
              <div className="text-xs text-stone-300">
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
            onChange={(e) => setCompanyName(e.target.value)}
            leftIcon={<Building2 className="w-4 h-4" />}
          />
        </FormField>

        <FormField
          label={t(
            "sellerworkspace.proStorefrontEditorPage.numeroSiret14Chiffres",
          )}
          required
          hint="Vérifié au répertoire SIRENE INSEE"
        >
          <Input value={siret} onChange={(e) => setSiret(e.target.value)} />
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Adresse physique" required>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </FormField>

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
            leftIcon={<MapPin className="w-4 h-4" />}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label={t(
            "sellerworkspace.proStorefrontEditorPage.telephoneCommercial",
          )}
        >
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
          />
        </FormField>

        <FormField label="Site internet officiel">
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            leftIcon={<Globe className="w-4 h-4" />}
          />
        </FormField>
      </div>

      <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
        <a
          href={`/boutique/${currentUser?.storeSlug || "atelier-nordique"}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
        >
          <Globe className="w-4 h-4" />
          <span>
            {t("sellerworkspace.proStorefrontEditorPage.voirMaVitrineEnDirect")}
          </span>
        </a>

        {/* `size="lg"` + a nowrap label is 286px wide, which alone overflows a
            320px viewport. Full-width below `sm` is the platform idiom for a
            form's primary action and removes the overflow at its source. */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          leftIcon={<Check className="w-4 h-4" />}
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
