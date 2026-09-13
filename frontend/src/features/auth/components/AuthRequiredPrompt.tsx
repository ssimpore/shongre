import React, { useId } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import { colors } from "@shongre/design-tokens";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../../design-system/primitives/Button";
import { routes } from "../../../configuration/routes";
import { useTranslation } from "../../../i18n/I18nProvider";

export const AuthRequiredPrompt: React.FC = () => {
  const { t } = useTranslation();
  const illustrationId = useId();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return (
    <AuthLayout
      width="compact"
      title={t("auth.frame.required")}
      subtitle={t("security.requireAuth.cettePageEstReserveeAux")}
      illustration={
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 200 184"
          className="mx-auto mb-5 h-32 w-40 sm:h-36 sm:w-44"
        >
          <defs>
            <linearGradient
              id={`${illustrationId}-shackle`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop stopColor={colors.action.primarySurfaceStrong} />
              <stop offset="0.5" stopColor={colors.action.primary} />
              <stop offset="1" stopColor={colors.action.primaryBorder} />
            </linearGradient>
            <linearGradient
              id={`${illustrationId}-body`}
              x1="0"
              y1="0"
              x2="0.6"
              y2="1"
            >
              <stop stopColor={colors.action.primarySurface} />
              <stop offset="1" stopColor={colors.action.primarySurfaceStrong} />
            </linearGradient>
          </defs>
          <path
            d="M99 8C148 3 171 34 182 74S165 150 123 168 32 158 20 120 35 21 72 11Z"
            className="fill-primary-surface-soft"
          />
          <path
            d="m19 69-9-8m7 32H5m14 24-9 8m171-56 9-8m-7 32h12m-14 24 9 8"
            className="stroke-primary-border-strong"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <ellipse
            cx="100"
            cy="143"
            rx="32"
            ry="4"
            className="fill-primary-shadow blur-sm"
          />
          <path
            d="M79 85V65a21 21 0 0 1 42 0v20"
            className="stroke-bg-surface"
            strokeWidth="13"
            fill="none"
          />
          <path
            d="M79 85V65a21 21 0 0 1 42 0v20"
            stroke={`url(#${illustrationId}-shackle)`}
            strokeWidth="11"
            fill="none"
          />
          <path
            d="M77 72v-7a23 23 0 0 1 38-17"
            className="stroke-bg-surface"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <rect
            x="63"
            y="80"
            width="74"
            height="62"
            rx="16"
            className="fill-bg-surface"
          />
          <rect
            x="63"
            y="80"
            width="74"
            height="62"
            rx="16"
            fill={`url(#${illustrationId}-body)`}
            className="stroke-primary-border-soft"
          />
          <path
            d="M70 94q0-8 9-8h43"
            className="stroke-bg-surface"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M108 108a8 8 0 1 0-12 7v8a4 4 0 0 0 8 0v-8a8 8 0 0 0 4-7Z"
            className="fill-primary"
          />
        </svg>
      }
    >
      <div
        data-auth-prompt-actions
        className="mx-auto grid w-fit max-w-full grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Button
          to={routes.auth.login(returnTo)}
          variant="primary"
          className="w-full"
          rightIcon={<ArrowRight className="h-icon-lg w-icon-lg" />}
        >
          {t("auth.frame.signIn")}
        </Button>
        <Button
          to={routes.auth.register(returnTo)}
          variant="outline"
          className="w-full"
          leftIcon={<UserPlus className="h-icon-lg w-icon-lg" />}
        >
          {t("security.requireAuth.creerUnCompte")}
        </Button>
      </div>
    </AuthLayout>
  );
};
