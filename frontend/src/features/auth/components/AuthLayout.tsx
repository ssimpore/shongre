import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../../i18n/I18nProvider";

/**
 * Card frame for the authentication screens.
 *
 * These pages render inside FocusedLayout, the same shell as the publication
 * wizard, which already supplies the brand mark and the two ways out (back and
 * close). This component owns only what is specific to authentication: the
 * heading, the card, and the trust strip. It deliberately does not repeat the
 * logo — it used to, from a time when these routes sat inside the marketplace
 * shell, which now would show the wordmark twice within 100px.
 */
export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  children: React.ReactNode;
  footerLink?: {
    text: string;
    linkText: string;
    to: string;
  };
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  badgeText,
  children,
  footerLink,
}) => {
  const { t } = useTranslation();
  return (
    // 3.5rem is the FocusedLayout header, so the card centres in the space
    // actually left to it rather than sitting slightly low.
    <div className="min-h-auth-shell-min flex flex-col justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-50/70 via-white to-stone-50/50">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          {badgeText && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold mb-2">
              <Sparkles className="w-icon-sm h-icon-sm" />
              <span>{badgeText}</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Card Frame */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xl shadow-stone-200/40 p-6 sm:p-8">
          {children}

          {footerLink && (
            <div className="mt-6 pt-6 border-t border-stone-100 text-center text-xs sm:text-sm text-stone-600">
              {footerLink.text}{" "}
              <Link
                to={footerLink.to}
                className="font-bold text-primary hover:text-primary-hover transition-colors underline underline-offset-4"
              >
                {footerLink.linkText}
              </Link>
            </div>
          )}
        </div>

        {/* Trust Guarantees */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-micro font-semibold text-stone-600">
          <div className="flex items-center gap-1.5">
            <Lock className="w-icon-sm h-icon-sm text-stone-600" />
            <span>Chiffrement SSL 256-bit</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-stone-300" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-icon-sm h-icon-sm text-stone-600" />
            <span>{t("auth.authLayout.conformiteRgpdFranceUe")}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-stone-300" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-icon-sm h-icon-sm text-success" />
            <span>{t("auth.authLayout.protectionAcheteurVendeur")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
