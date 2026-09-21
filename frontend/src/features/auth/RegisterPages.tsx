import React, { useState, useRef, useEffect } from "react";
import { Select } from "../../design-system";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  ArrowRight,
  Check,
  Building2,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { PasswordField } from "./components/PasswordField";
import { AuthLayout } from "./components/AuthLayout";
import { AccountTypeSelector } from "./components/AccountTypeSelector";
import { AccountTypeBackdrop } from "./components/AccountTypeBackdrop";
import { SocialLoginButtons } from "./components/SocialLoginButtons";
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
  >("professional");

  const handleContinue = (accountType: "individual" | "professional") => {
    if (accountType === "individual") {
      navigate(routes.auth.registerIndividual(returnTo));
    } else {
      navigate(routes.auth.registerProfessional(returnTo));
    }
  };

  return (
    <AuthLayout
      showLegalNotice
      width="wide"
      contentFrame="open"
      density="compact"
      backdrop={<AccountTypeBackdrop />}
      title={t("auth.registerPages.chooseProfile")}
      subtitle={t("auth.registerPages.chooseProfileDescription")}
      footerLink={{
        text: t("auth.frame.alreadyMember"),
        linkText: t("auth.frame.signIn"),
        to: routes.auth.login(returnTo),
      }}
    >
      <fieldset>
        <legend className="sr-only">
          {t("auth.registerPages.1SelectionnezVotreProfilD")}
        </legend>
        <AccountTypeSelector
          selectedType={selectedType}
          onChange={setSelectedType}
          onContinue={handleContinue}
          layout="columns"
        />
      </fieldset>
    </AuthLayout>
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
  const { activeMarket, availableMarkets } = useMarketLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState(activeMarket.code);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialPending, setSocialPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (socialPending || isLoading) return;
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

  return (
    <AuthLayout
      width="compact"
      showLegalNotice
      title="Inscription Particulier"
      subtitle={t("auth.registerPages.creezVotreCompteGratuitEn")}
      footerLink={{
        text: t("auth.frame.alreadyMember"),
        linkText: t("auth.frame.signIn"),
        to: routes.auth.login(returnTo),
      }}
    >
      <SocialLoginButtons
        accountType="individual"
        returnTo={returnTo}
        disabled={isLoading}
        onPendingChange={setSocialPending}
      />
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5"
        >
          <AlertCircle className="w-icon-md h-icon-md text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={socialPending || isLoading} className="space-y-4">
          <div>
            <label
              htmlFor="reg-name"
              className="block text-sm font-semibold text-text-strong mb-1.5"
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
                className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
              <User className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-semibold text-text-strong mb-1.5"
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
                className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
              <Mail className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="reg-country"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                Pays <span className="text-primary">*</span>
              </label>
              <Select
                className="w-full"
                id="reg-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {availableMarkets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="reg-code-postal"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                Code Postal <span className="text-primary">*</span>
              </label>
              <input
                id="reg-code-postal"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Code postal"
                required
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
            </div>

            <div>
              <label
                htmlFor="reg-ville"
                className="block text-sm font-semibold text-text-strong mb-1.5"
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
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
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
          <div className="space-y-2.5 pt-2 border-t border-border-soft">
            <label className="flex items-start gap-2 text-xs text-text-emphasis cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                className="w-4 h-4 mt-0.5 rounded border-border-prominent text-primary focus:ring-primary shrink-0"
              />
              <span>
                J'ai lu et j'accepte les{" "}
                <Link
                  to="/conditions-utilisation"
                  target="_blank"
                  className="font-bold text-text-main underline decoration-primary underline-offset-4"
                >
                  {t("auth.registerPages.conditionsGeneralesDUtilisation")}
                </Link>{" "}
                et la{" "}
                <Link
                  to="/confidentialite"
                  target="_blank"
                  className="font-bold text-text-main underline decoration-primary underline-offset-4"
                >
                  {t("auth.registerPages.politiqueDeConfidentialite")}
                </Link>{" "}
                de Shongre. <span className="text-primary">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-text-supporting cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-border-prominent text-primary focus:ring-primary shrink-0"
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
            rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
          >
            {t("auth.registerPages.creerMonCompteParticulier")}
          </Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
};

export const RegisterProPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedProduct =
    searchParams.get("product") === "facturation"
      ? ("facturation" as const)
      : undefined;
  const isFacturationRegistration = requestedProduct === "facturation";
  usePageMeta({
    title: isFacturationRegistration
      ? "Créer votre espace Shongre Facturation"
      : "Créer un compte professionnel",
    description: isFacturationRegistration
      ? "Créez votre compte et votre organisation Shongre pour utiliser Facturation indépendamment des autres produits."
      : "Ouvrez un compte professionnel Shongre : vitrine personnalisée, quotas d'annonces étendus, statistiques et facturation.",
    canonicalPath: "/inscription/professionnel",
  });

  const navigate = useNavigate();
  const returnTo = useRegistrationReturn(routes.workspace.pro.dashboard());
  const { registerProfessional } = useAuth();
  const toast = useToast();
  const { activeMarket, availableMarkets } = useMarketLocation();

  const [step, setStep] = useState<1 | 2>(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: "center" });
    }
  }, [step]);

  // Step 1: Contact & Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Company & Legal
  const [companyName, setCompanyName] = useState("");
  const [professionalVertical, setProfessionalVertical] =
    useState<ProfessionalVertical>("generic");
  const [country, setCountry] = useState(activeMarket.code);
  const [sirenSiret, setSirenSiret] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [socialPending, setSocialPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (socialPending || isLoading) return;
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
    if (socialPending || isLoading) return;
    setErrorMessage(null);

    if (!companyName.trim()) {
      setErrorMessage("La raison sociale de votre entreprise est requise.");
      return;
    }

    if (!sirenSiret.trim()) {
      setErrorMessage("L’identifiant légal de l’entreprise est requis.");
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
        requestedProduct,
      });

      if (result.success) {
        toast.success(
          isFacturationRegistration
            ? "Compte créé. Terminons la configuration de Facturation."
            : "Compte Professionnel créé ! Bienvenue dans votre espace Pro.",
        );
        navigate(
          isFacturationRegistration
            ? returnTo
            : result.user?.status === "pending"
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
    <AuthLayout
      width="compact"
      showLegalNotice
      title={
        isFacturationRegistration
          ? "Créez votre espace Facturation"
          : t("auth.registerPages.ouvrirUnCompteProfessionnel")
      }
      subtitle={
        isFacturationRegistration
          ? "Un compte Shongre partagé, une organisation et uniquement les outils de facturation dont vous avez besoin."
          : t("auth.registerPages.accedezALaVitrineOfficielle")
      }
      headingRef={headingRef}
      footerLink={{
        text: t("auth.frame.alreadyMember"),
        linkText: t("auth.frame.signIn"),
        to: routes.auth.login(returnTo),
      }}
      progress={
        <ol
          aria-label={t("auth.frame.registrationSteps")}
          className="mb-6 flex items-center justify-center gap-3 text-xs font-semibold sm:text-sm"
        >
          {[
            t("auth.registerPages.identiteDuGerant"),
            t("auth.frame.companyStep"),
          ].map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? "step" : undefined}
              className="flex items-center gap-2 text-text-supporting"
            >
              {index > 0 && (
                <ChevronRight
                  className="mr-1 h-icon-sm w-icon-sm text-text-muted"
                  aria-hidden="true"
                />
              )}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${step >= index + 1 ? "bg-primary text-on-primary" : "bg-surface-disabled text-text-supporting"}`}
                aria-hidden="true"
              >
                {step > index + 1 ? (
                  <Check className="h-icon-sm w-icon-sm" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={
                  step === index + 1 ? "font-bold text-text-main" : undefined
                }
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      }
    >
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5"
        >
          <AlertCircle className="w-icon-md h-icon-md text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {step === 1 ? (
        <>
          <SocialLoginButtons
            accountType="professional"
            returnTo={returnTo}
            disabled={isLoading}
            onPendingChange={setSocialPending}
          />
          <form onSubmit={handleNextStep}>
            <fieldset
              disabled={socialPending || isLoading}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="reg-pro-name"
                  className="block text-sm font-semibold text-text-strong mb-1.5"
                >
                  {t("auth.registerPages.nomEtPrenomDuResponsable")}
                  <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-pro-name"
                    autoComplete="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Sophie Marchand"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
                  />
                  <User className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email-professionnel"
                  className="block text-sm font-semibold text-text-strong mb-1.5"
                >
                  Email professionnel <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-email-professionnel"
                    autoComplete="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@boutiquedeco.fr"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
                  />
                  <Mail className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-telephonecommercial"
                  className="block text-sm font-semibold text-text-strong mb-1.5"
                >
                  {t("auth.registerPages.telephoneCommercial")}
                </label>
                <div className="relative">
                  <input
                    id="reg-telephonecommercial"
                    autoComplete="tel"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01 42 68 90 12"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
                  />
                  <Phone className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
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
                  rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
                >
                  {t(
                    "auth.registerPages.continuerVersLesInformationsEntreprise",
                  )}
                </Button>
              </div>
            </fieldset>
          </form>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reg-activite-professionnelle"
              className="block text-sm font-semibold text-text-strong mb-1.5"
            >
              Activité professionnelle <span className="text-primary">*</span>
            </label>
            <Select
              className="w-full"
              id="reg-activite-professionnelle"
              value={professionalVertical}
              onChange={(event) =>
                setProfessionalVertical(
                  event.target.value as ProfessionalVertical,
                )
              }
              required
            >
              {PROFESSIONAL_VERTICAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === "education"
                    ? t("verticals.education.training")
                    : option.label}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-text-tertiary">
              {isFacturationRegistration
                ? "Ce renseignement adapte la configuration de votre organisation. Il ne vous inscrit à aucun autre produit Shongre."
                : "Ce choix active uniquement les outils métier correspondant à votre activité. Il pourra être vérifié lors de l'onboarding."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reg-pays-d-immatriculation"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                Pays d'immatriculation <span className="text-primary">*</span>
              </label>
              <Select
                className="w-full"
                id="reg-pays-d-immatriculation"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {availableMarkets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="reg-forme-juridique"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                Forme juridique <span className="text-primary">*</span>
              </label>
              <input
                id="reg-forme-juridique"
                value={legalForm}
                onChange={(event) => setLegalForm(event.target.value)}
                required
                autoComplete="organization-title"
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-raison-sociale-enseigne-commerciale"
              className="block text-sm font-semibold text-text-strong mb-1.5"
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
                className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
              <Building2 className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reg-currentmarket-businessidentifierlabel"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                Identifiant légal de l’entreprise{" "}
                <span className="text-primary">*</span>
              </label>
              <input
                id="reg-currentmarket-businessidentifierlabel"
                type="text"
                value={sirenSiret}
                onChange={(e) => setSirenSiret(e.target.value)}
                placeholder="Numéro d’immatriculation"
                required
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
            </div>

            <div>
              <label
                htmlFor="reg-tva-intracommunautaire"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                TVA Intracommunautaire
              </label>
              <input
                id="reg-tva-intracommunautaire"
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="Numéro de TVA"
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-adressedusiegesocialmagasin"
              className="block text-sm font-semibold text-text-strong mb-1.5"
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
                className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
              <MapPin className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reg-code-postal-2"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                Code Postal <span className="text-primary">*</span>
              </label>
              <input
                id="reg-code-postal-2"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Code postal"
                required
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
            </div>

            <div>
              <label
                htmlFor="reg-ville-2"
                className="block text-sm font-semibold text-text-strong mb-1.5"
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
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
            </div>
          </div>

          {/* Declarations */}
          <div className="pt-2 border-t border-border-soft">
            <label className="flex items-start gap-2 text-xs text-text-emphasis cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                className="w-4 h-4 mt-0.5 rounded border-border-prominent text-primary focus:ring-primary shrink-0"
              />
              <span>
                Je certifie sur l'honneur l'exactitude des informations
                d'immatriculation de mon entreprise et j'accepte les{" "}
                <Link
                  to="/conditions-utilisation"
                  target="_blank"
                  className="font-bold text-text-main underline decoration-primary underline-offset-4"
                >
                  {t(
                    "auth.registerPages.conditionsGeneralesDeVenteProfessionnelles",
                  )}
                </Link>{" "}
                Shongre. <span className="text-primary">*</span>
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setErrorMessage(null);
                setStep(1);
              }}
              disabled={isLoading}
            >
              ← Retour
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:flex-1"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
            >
              {t("auth.frame.createPro")}
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
