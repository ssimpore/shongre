import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ContactRound,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, OnboardingPreparationPage } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AccountTypeSelector } from "./components/AccountTypeSelector";
import { useTranslation } from "../../i18n/I18nProvider";
import { scrollToTop } from "../../utilities/motion";

export function AccountTypeOnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [accountType, setAccountType] = useState<"individual" | "professional">(
    "individual",
  );
  const [isPreparationVisible, setIsPreparationVisible] = useState(true);
  const onboardingHeadingRef = useRef<HTMLHeadingElement>(null);

  usePageMeta({
    title: "Choisir votre type de compte",
    description: "Choisissez le parcours Shongre adapté à votre activité.",
    noIndex: true,
  });

  useEffect(() => {
    if (!isPreparationVisible) onboardingHeadingRef.current?.focus();
  }, [isPreparationVisible]);

  const showAccountTypeSelection = () => {
    setIsPreparationVisible(false);
    scrollToTop();
  };

  const showPreparation = () => {
    setIsPreparationVisible(true);
    scrollToTop();
  };

  if (isPreparationVisible) {
    return (
      <OnboardingPreparationPage
        eyebrow={t("onboarding.preparation.account.eyebrow")}
        title={t("onboarding.preparation.account.title")}
        description={t("onboarding.preparation.account.description")}
        checklistTitle={t("onboarding.preparation.account.checklistTitle")}
        items={[
          {
            title: t("onboarding.preparation.account.usageTitle"),
            description: t("onboarding.preparation.account.usageDescription"),
            icon: UserRound,
          },
          {
            title: t("onboarding.preparation.account.businessTitle"),
            description: t(
              "onboarding.preparation.account.businessDescription",
            ),
            icon: Building2,
          },
          {
            title: t("onboarding.preparation.account.contactTitle"),
            description: t("onboarding.preparation.account.contactDescription"),
            icon: ContactRound,
          },
        ]}
        actionLabel={t("onboarding.preparation.account.start")}
        durationLabel={t("onboarding.preparation.account.duration")}
        statusLabel={t("onboarding.preparation.account.status")}
        onStart={showAccountTypeSelection}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
        onClick={showPreparation}
      >
        {t("onboarding.preparation.back")}
      </Button>
      <header>
        <h1
          ref={onboardingHeadingRef}
          tabIndex={-1}
          className="text-xl font-bold text-stone-950 focus:outline-none sm:text-2xl"
        >
          {t("auth.onboarding.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {t("auth.onboarding.description")}
        </p>
      </header>
      <AccountTypeSelector
        selectedType={accountType}
        onChange={setAccountType}
      />
      <Button
        variant="primary"
        className="w-full sm:w-auto"
        rightIcon={<ArrowRight className="h-icon-md w-icon-md" />}
        onClick={() =>
          navigate(
            accountType === "professional"
              ? "/compte?onboarding=professional"
              : "/compte",
            { replace: true },
          )
        }
      >
        {t("auth.onboarding.continue")}
      </Button>
    </div>
  );
}
