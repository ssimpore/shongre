import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../design-system/primitives/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AccountTypeSelector } from "./components/AccountTypeSelector";
import { useTranslation } from "../../i18n/I18nProvider";

export function AccountTypeOnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [accountType, setAccountType] = useState<"individual" | "professional">(
    "individual",
  );

  usePageMeta({
    title: "Choisir votre type de compte",
    description: "Choisissez le parcours Shongre adapté à votre activité.",
    noIndex: true,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-black text-stone-950 sm:text-2xl">
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
