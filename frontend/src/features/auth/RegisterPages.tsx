import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { PasswordField } from "./components/PasswordField";
import { AuthLayout } from "./components/AuthLayout";
import { AccountTypeSelector } from "./components/AccountTypeSelector";
import { SocialLoginButtons } from "./components/SocialLoginButtons";
import {
  SUPPORTED_MARKETS,
  validateBusinessIdentifier,
} from "../../configuration/market.config";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";
import { resolveSafeReturn } from "../../security/safe-return";
import type { ProfessionalVertical } from "../../types";

const PROFESSIONAL_VERTICAL_OPTIONS: ReadonlyArray<{
  value: ProfessionalVertical;
  label: string;
}> = [
  { value: "generic", label: "Commerce et services généralistes" },
  { value: "real_estate", label: "Immobilier" },
  { value: "automotive", label: "Automobile" },
  { value: "education", label: "" },
  { value: "employment", label: "Emploi et recrutement" },
];

const useRegistrationReturn = (fallback: string) => {
  const [searchParams] = useSearchParams();
  return resolveSafeReturn(
    searchParams.get("redirect") || searchParams.get("returnTo"),
    fallback,
  );
};

export const RegisterChoicePage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Créer un compte",
    description:
      "Créez un compte Shongre en une minute : particulier pour vendre ponctuellement, professionnel pour une vitrine et des outils dédiés.",
    canonicalPath: "/inscription",
  });

  const navigate = useNavigate();
  const returnTo = useRegistrationReturn(routes.workspace.overview());
  const [selectedType, setSelectedType] = useState<
    "individual" | "professional"
  >("individual");

  const handleContinue = () => {
    if (selectedType === "individual") {
      navigate(routes.auth.registerIndividual(returnTo));
    } else {
      navigate(routes.auth.registerProfessional(returnTo));
    }
  };

  return (
    // 3.5rem is the FocusedLayout header. The brand mark it already shows is
    // why there is no logo repeated here.
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-50/70 via-white to-stone-50/50">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Inscription gratuite</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {t("auth.registerPages.creerVotreCompteShongre")}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            {t("auth.registerPages.rejoignezLaCommunauteDeCommerce")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xl shadow-stone-200/40 p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-xs font-extrabold text-stone-900 uppercase tracking-wider mb-3">
              {t("auth.registerPages.1SelectionnezVotreProfilD")}
            </label>
            <AccountTypeSelector
              selectedType={selectedType}
              onChange={setSelectedType}
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-100">
            <div className="text-xs text-stone-500 text-center sm:text-left">
              Vous avez déjà un compte ?{" "}
              <Link
                to={routes.auth.login(returnTo)}
                className="font-bold text-primary hover:underline"
              >
                Se connecter
              </Link>
            </div>

            <Button
              type="button"
              variant={selectedType === "professional" ? "pro" : "primary"}
              size="md"
              className="w-full sm:w-auto"
              onClick={handleContinue}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continuer en{" "}
              {selectedType === "professional"
                ? "Professionnel"
                : "Particulier"}
            </Button>
          </div>
        </div>

        {/* FAQ note */}
        <div className="mt-6 p-4 rounded-xl bg-stone-100/60 border border-stone-200 text-xs text-stone-600 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <strong className="text-stone-900">
              {t("auth.registerPages.evolutionDeCompteSouple")}
            </strong>{" "}
            Vous commencez en tant que particulier et souhaitez ouvrir une
            boutique plus tard ? Vous pourrez passer en compte professionnel en
            1 clic depuis vos paramètres.
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterIndividualPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Créer un compte particulier",
    description:
      "Ouvrez un compte particulier Shongre pour publier vos annonces gratuitement et acheter en toute sécurité.",
    canonicalPath: "/inscription/particulier",
  });

  const navigate = useNavigate();
  const returnTo = useRegistrationReturn(routes.workspace.overview());
  const { registerIndividual } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("FR");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!termsAccepted) {
      setErrorMessage(
        "Veuillez accepter les conditions générales d'utilisation pour continuer.",
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerIndividual({
        name: name.trim(),
        email: email.trim(),
        password,
        city: city.trim(),
        postalCode: postalCode.trim(),
        country,
        termsAccepted,
        marketingConsent,
      });

      if (result.success) {
        toast.success(
          "Compte Particulier créé avec succès ! Bienvenue sur Shongre.",
        );
        navigate(returnTo, { replace: true });
      } else {
        setErrorMessage(
          result.errorMessage || "Échec de la création de compte.",
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const market = SUPPORTED_MARKETS[country] || SUPPORTED_MARKETS["FR"];

  return (
    <AuthLayout
      title="Inscription Particulier"
      subtitle={t("auth.registerPages.creezVotreCompteGratuitEn")}
      badgeText="Compte Particulier Gratuit"
      footerLink={{
        text: "Vous êtes un professionnel ?",
        linkText: "Créer un compte Pro",
        to: routes.auth.registerProfessional(returnTo),
      }}
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="reg-name"
            className="block text-xs font-bold text-stone-800 mb-1.5"
          >
            {t("auth.registerPages.nomEtPrenomOuPseudonyme")}
            <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Thomas Laurent"
              required
              autoComplete="name"
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
            />
            <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-xs font-bold text-stone-800 mb-1.5"
          >
            Adresse email <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="thomas.laurent@exemple.fr"
              required
              autoComplete="email"
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
            />
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="reg-country"
              className="block text-xs font-bold text-stone-800 mb-1.5"
            >
              Pays <span className="text-primary">*</span>
            </label>
            <select
              id="reg-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-control text-xs font-bold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
            >
              {Object.values(SUPPORTED_MARKETS).map((m) => (
                <option key={m.code} value={m.code}>
                  {m.flag} {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reg-code-postal"
              className="block text-xs font-bold text-stone-800 mb-1.5"
            >
              Code Postal <span className="text-primary">*</span>
            </label>
            <input
              id="reg-code-postal"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder={market.postalCodePlaceholder}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
            />
          </div>

          <div>
            <label
              htmlFor="reg-ville"
              className="block text-xs font-bold text-stone-800 mb-1.5"
            >
              Ville <span className="text-primary">*</span>
            </label>
            <input
              id="reg-ville"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ex: Paris"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
            />
          </div>
        </div>

        <div>
          <PasswordField
            id="reg-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showStrength
            required
            autoComplete="new-password"
          />
        </div>

        {/* Consents */}
        <div className="space-y-2.5 pt-2 border-t border-stone-100">
          <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="w-4 h-4 mt-0.5 rounded border-stone-300 text-primary focus:ring-primary shrink-0"
            />
            <span>
              J'ai lu et j'accepte les{" "}
              <Link
                to="/conditions-utilisation"
                target="_blank"
                className="font-bold text-primary hover:underline"
              >
                {t("auth.registerPages.conditionsGeneralesDUtilisation")}
              </Link>{" "}
              et la{" "}
              <Link
                to="/confidentialite"
                target="_blank"
                className="font-bold text-primary hover:underline"
              >
                {t("auth.registerPages.politiqueDeConfidentialite")}
              </Link>{" "}
              de Shongre. <span className="text-primary">*</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-stone-300 text-primary focus:ring-primary shrink-0"
            />
            <span>{t("auth.registerPages.jeSouhaiteRecevoirParEmail")}</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {t("auth.registerPages.creerMonCompteParticulier")}
        </Button>
      </form>
      <div className="mt-6">
        <SocialLoginButtons accountType="individual" returnTo={returnTo} />
      </div>
    </AuthLayout>
  );
};

export const RegisterProPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Créer un compte professionnel",
    description:
      "Ouvrez un compte professionnel Shongre : vitrine personnalisée, quotas d'annonces étendus, statistiques et facturation.",
    canonicalPath: "/inscription/professionnel",
  });

  const navigate = useNavigate();
  const returnTo = useRegistrationReturn(routes.workspace.pro.dashboard());
  const { registerProfessional } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Contact & Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Company & Legal
  const [companyName, setCompanyName] = useState("");
  const [professionalVertical, setProfessionalVertical] =
    useState<ProfessionalVertical>("generic");
  const [country, setCountry] = useState("FR");
  const [sirenSiret, setSirenSiret] = useState("");
  const [legalForm, setLegalForm] = useState(
    "Micro-entreprise / Auto-entrepreneur",
  );
  const [vatNumber, setVatNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentMarket = SUPPORTED_MARKETS[country] || SUPPORTED_MARKETS["FR"];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim()) {
      setErrorMessage("Veuillez remplir votre nom et votre adresse email.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyName.trim()) {
      setErrorMessage("La raison sociale de votre entreprise est requise.");
      return;
    }

    if (!validateBusinessIdentifier(sirenSiret, country)) {
      setErrorMessage(
        `Identifiant d'entreprise invalide. ${currentMarket.businessIdentifierHelper}`,
      );
      return;
    }

    if (!termsAccepted) {
      setErrorMessage(
        "Veuillez certifier l'exactitude des informations et accepter les CGU Professionnelles.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerProfessional({
        name: name.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        professionalVertical,
        sirenSiret: sirenSiret.trim(),
        legalForm,
        vatNumber: vatNumber.trim() || undefined,
        businessAddress: businessAddress.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country,
        phone: phone.trim() || undefined,
        termsAccepted,
      });

      if (result.success) {
        toast.success(
          "Compte Professionnel créé ! Bienvenue dans votre espace Pro.",
        );
        navigate(
          result.user?.status === "pending"
            ? routes.workspace.verification()
            : returnTo,
          { replace: true },
        );
      } else {
        setErrorMessage(
          result.errorMessage || "Échec de la création de compte Pro.",
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 3.5rem is the FocusedLayout header, which already carries the brand mark.
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-50/70 via-white to-stone-50/50">
      <div className="w-full max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-bold mb-3">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{t("auth.registerPages.vendeurProfessionnel")}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {t("auth.registerPages.ouvrirUnCompteProfessionnel")}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            {t("auth.registerPages.accedezALaVitrineOfficielle")}
          </p>
        </div>

        {/* Step progress bar */}
        <div className="mb-6 flex items-center justify-center gap-3 text-xs font-bold">
          <div
            className={`flex items-center gap-1.5 ${step === 1 ? "text-primary" : "text-success"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? "bg-primary text-white" : "bg-success-surface text-success"}`}
            >
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </span>
            <span>{t("auth.registerPages.identiteDuGerant")}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-300" />
          <div
            className={`flex items-center gap-1.5 ${step === 2 ? "text-stone-950 font-black" : "text-stone-500"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"}`}
            >
              2
            </span>
            <span>Entreprise & SIRET</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xl shadow-stone-200/40 p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {step === 1 ? (
            <>
              <form onSubmit={handleNextStep} className="space-y-4">
                <div>
                  <label
                    htmlFor="reg-pro-name"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    {t("auth.registerPages.nomEtPrenomDuResponsable")}
                    <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-pro-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Sophie Marchand"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                    />
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-email-professionnel"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    Email professionnel <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-email-professionnel"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@boutiquedeco.fr"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-telephonecommercial"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    {t("auth.registerPages.telephoneCommercial")}
                  </label>
                  <div className="relative">
                    <input
                      id="reg-telephonecommercial"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01 42 68 90 12"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <PasswordField
                    id="pro-reg-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    showStrength
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {t(
                      "auth.registerPages.continuerVersLesInformationsEntreprise",
                    )}
                  </Button>
                </div>
              </form>
              <div className="mt-6">
                <SocialLoginButtons
                  accountType="professional"
                  returnTo={returnTo}
                />
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reg-activite-professionnelle"
                  className="block text-xs font-bold text-stone-800 mb-1.5"
                >
                  Activité professionnelle{" "}
                  <span className="text-primary">*</span>
                </label>
                <select
                  id="reg-activite-professionnelle"
                  value={professionalVertical}
                  onChange={(event) =>
                    setProfessionalVertical(
                      event.target.value as ProfessionalVertical,
                    )
                  }
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-control text-xs font-bold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                >
                  {PROFESSIONAL_VERTICAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "education"
                        ? t("verticals.education.training")
                        : option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-stone-500">
                  Ce choix active uniquement les outils métier correspondant à
                  votre activité. Il pourra être vérifié lors de l'onboarding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-pays-d-immatriculation"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    Pays d'immatriculation{" "}
                    <span className="text-primary">*</span>
                  </label>
                  <select
                    id="reg-pays-d-immatriculation"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-control text-xs font-bold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  >
                    {Object.values(SUPPORTED_MARKETS).map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.flag} {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-forme-juridique"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    Forme juridique <span className="text-primary">*</span>
                  </label>
                  <select
                    id="reg-forme-juridique"
                    value={legalForm}
                    onChange={(e) => setLegalForm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-control text-xs font-bold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  >
                    {currentMarket.supportedLegalForms.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-raison-sociale-enseigne-commerciale"
                  className="block text-xs font-bold text-stone-800 mb-1.5"
                >
                  Raison sociale / Enseigne commerciale{" "}
                  <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-raison-sociale-enseigne-commerciale"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ex: Atelier Nordique SAS"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  />
                  <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-currentmarket-businessidentifierlabel"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    {currentMarket.businessIdentifierLabel}{" "}
                    <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-currentmarket-businessidentifierlabel"
                    type="text"
                    value={sirenSiret}
                    onChange={(e) => setSirenSiret(e.target.value)}
                    placeholder={
                      currentMarket.businessIdentifierFormatPlaceholder
                    }
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-tva-intracommunautaire"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    TVA Intracommunautaire
                  </label>
                  <input
                    id="reg-tva-intracommunautaire"
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder={currentMarket.vatNumberFormatPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-adressedusiegesocialmagasin"
                  className="block text-xs font-bold text-stone-800 mb-1.5"
                >
                  {t("auth.registerPages.adresseDuSiegeSocialMagasin")}
                  <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-adressedusiegesocialmagasin"
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder={t("auth.registerPages.14RueDesAntiquaires")}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  />
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-code-postal-2"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    Code Postal <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-code-postal-2"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={currentMarket.postalCodePlaceholder}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-ville-2"
                    className="block text-xs font-bold text-stone-800 mb-1.5"
                  >
                    Ville <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-ville-2"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bordeaux"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-control-touch"
                  />
                </div>
              </div>

              {/* Declarations */}
              <div className="pt-2 border-t border-stone-100">
                <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                    className="w-4 h-4 mt-0.5 rounded border-stone-300 text-primary focus:ring-primary shrink-0"
                  />
                  <span>
                    Je certifie sur l'honneur l'exactitude des informations
                    d'immatriculation de mon entreprise et j'accepte les{" "}
                    <Link
                      to="/conditions-utilisation"
                      target="_blank"
                      className="font-bold text-primary hover:underline"
                    >
                      {t(
                        "auth.registerPages.conditionsGeneralesDeVenteProfessionnelles",
                      )}
                    </Link>{" "}
                    Shongre. <span className="text-primary">*</span>
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  ← Retour
                </Button>
                <Button
                  type="submit"
                  variant="pro"
                  size="md"
                  className="flex-1"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Valider mon inscription Pro
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-stone-100 text-center text-xs text-stone-500">
            Vous avez déjà un compte ?{" "}
            <Link
              to={routes.auth.login(returnTo)}
              className="font-bold text-primary hover:underline"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
