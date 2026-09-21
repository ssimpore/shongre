import React from "react";
import { Link } from "react-router-dom";
import { LockKeyhole, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "compact" | "form" | "wide";
  contentFrame?: "card" | "open";
  illustration?: React.ReactNode;
  progress?: React.ReactNode;
  backdrop?: React.ReactNode;
  density?: "default" | "compact";
  headingRef?: React.Ref<HTMLHeadingElement>;
  footerLink?: { text: string; linkText: string; to: string };
  showLegalNotice?: boolean;
}

const AUTH_CONTENT_WIDTH = {
  compact: "max-w-md",
  form: "max-w-lg",
  wide: "max-w-5xl",
} as const;

/** Authentication owns the content frame; the enclosing shell owns navigation. */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  width = "form",
  contentFrame = "card",
  illustration,
  progress,
  backdrop,
  density = "default",
  headingRef,
  footerLink,
  showLegalNotice = false,
}) => {
  const { t } = useTranslation();
  const heading = (
    <div
      className={`text-center ${density === "compact" ? "mb-4" : "mb-6 sm:mb-8"}`}
    >
      {illustration}
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className={`tracking-tight text-text-main ${illustration ? "text-2xl font-bold sm:text-display-sm" : "text-2xl font-bold sm:text-3xl"}`}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={`mx-auto max-w-lg text-sm leading-relaxed text-text-muted sm:text-base ${density === "compact" ? "mt-2" : "mt-3"}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
  return (
    <div
      data-auth-layout
      className={`relative isolate flex flex-1 flex-col justify-center bg-surface-soft px-4 sm:px-6 ${density === "compact" ? "py-4 sm:py-3" : "py-8 sm:py-12"}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-base overflow-hidden"
      >
        {backdrop ?? (
          <>
            <svg
              viewBox="0 0 400 360"
              focusable="false"
              className="absolute -left-48 -top-2 h-96 w-96 fill-primary-surface-soft sm:-left-40"
            >
              <path d="M0 0 326 64Q400 80 383 161L352 291Q338 358 268 342L0 280Z" />
            </svg>
            <svg
              viewBox="0 0 400 440"
              focusable="false"
              className="absolute -right-48 -bottom-16 h-96 w-96 fill-primary-surface-soft sm:-right-32 sm:bottom-0"
            >
              <path d="M141 18Q176-13 229 10L400 91V440L70 393Q-7 372 24 286L101 71Q115 36 141 18Z" />
            </svg>
            <div className="absolute bottom-40 left-16 hidden grid-cols-5 gap-7 lg:grid">
              {Array.from({ length: 20 }, (_, index) => (
                <span
                  key={index}
                  className="h-2 w-2 rounded-full bg-border-disabled"
                />
              ))}
            </div>
            <div className="absolute right-16 top-28 hidden grid-cols-5 gap-7 lg:grid">
              {Array.from({ length: 20 }, (_, index) => (
                <span
                  key={index}
                  className="h-2 w-2 rounded-full bg-border-disabled"
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div
        className={`relative z-raised mx-auto w-full ${AUTH_CONTENT_WIDTH[width]}`}
      >
        {!illustration && heading}
        {progress}
        <div
          data-auth-card
          className={
            contentFrame === "card"
              ? "rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-sm sm:p-8"
              : "bg-transparent"
          }
        >
          {illustration && heading}
          {children}
          {footerLink && (
            <div
              className={`border-t border-border-soft text-center text-sm text-text-supporting ${density === "compact" ? "mt-3 pt-3" : "mt-6 pt-5"}`}
            >
              {footerLink.text}{" "}
              <Link
                to={footerLink.to}
                className="rounded-sm font-bold text-text-main underline decoration-primary underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                {footerLink.linkText}
              </Link>
            </div>
          )}
          {showLegalNotice && (
            <p
              data-auth-legal-notice
              className={`text-center text-xs leading-relaxed text-text-muted ${density === "compact" ? "mt-2" : "mt-5"}`}
            >
              {t("auth.social.privacy")}{" "}
              <Link
                className="font-semibold underline underline-offset-2"
                to="/conditions-utilisation"
              >
                {t("auth.social.terms")}
              </Link>{" "}
              {t("auth.social.privacyAcknowledgement")}{" "}
              <Link
                className="font-semibold underline underline-offset-2"
                to="/confidentialite"
              >
                {t("auth.social.privacyPolicy")}
              </Link>
              .
            </p>
          )}
        </div>
      </div>
      <ul
        className={`relative z-raised mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-text-muted sm:text-sm md:gap-x-0 ${density === "compact" ? "mt-2" : "mt-6 sm:mt-8"}`}
      >
        {[
          { Icon: LockKeyhole, label: t("auth.frame.privateAccount") },
          { Icon: ShieldCheck, label: t("auth.frame.identityControl") },
          { Icon: SlidersHorizontal, label: t("auth.frame.privacyControl") },
        ].map(({ Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2 md:border-border-disabled md:px-6 md:[&+li]:border-l"
          >
            <Icon className="h-icon-lg w-icon-lg shrink-0" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
};
