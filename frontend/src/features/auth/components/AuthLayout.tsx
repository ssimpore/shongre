import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { routes } from '../../../configuration/routes';

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
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-50/70 via-white to-stone-50/50">
      <div className="w-full max-w-md mx-auto">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to={routes.home()} className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-sm group-hover:scale-105 transition-transform">
              S
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-black tracking-tight text-stone-900 leading-none">
                Shongre<span className="text-primary">.</span>
              </span>
              <span className="text-micro font-bold text-stone-600 tracking-wider uppercase">
                Plateforme Sécurisée
              </span>
            </div>
          </Link>

          {badgeText && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
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
              {footerLink.text}{' '}
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
            <Lock className="w-3.5 h-3.5 text-stone-600" />
            <span>Chiffrement SSL 256-bit</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-stone-300" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
            <span>Conformité RGPD France & UE</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-stone-300" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>Protection Acheteur & Vendeur</span>
          </div>
        </div>
      </div>
    </div>
  );
};
