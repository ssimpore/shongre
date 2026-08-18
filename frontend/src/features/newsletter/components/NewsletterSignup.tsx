import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useToast } from '../../../app/providers/ToastProvider';
import { Button } from '../../../design-system/primitives/Button';
import { newsletterService } from '../../../domains/newsletter/newsletter.service';
import { newsletterRepository } from '../../../repositories/newsletter.repository';
import { NewsletterSubscriptionSource } from '../../../domains/newsletter/newsletter.types';

interface NewsletterSignupProps {
  variant?: 'band' | 'footer' | 'inline';
  showConsentCheckbox?: boolean;
  className?: string;
  source?: NewsletterSubscriptionSource;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  variant = 'band',
  showConsentCheckbox = true,
  className = '',
  source = 'homepage',
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState(currentUser?.email || '');
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = newsletterService.validateEmail(email);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Email invalide.');
      return;
    }

    if (showConsentCheckbox && !consent) {
      setErrorMessage('Veuillez accepter de recevoir les actualités Shongre.');
      return;
    }

    setIsSubmitting(true);
    try {
      await newsletterRepository.subscribe({
        email: email.trim(),
        subscriberId: currentUser?.id,
        accountType: currentUser?.sellerType === 'pro' ? 'pro' : 'individual',
        source,
        consentGiven: true,
      });

      setIsSuccess(true);
      toast.success('Votre inscription à la newsletter Shongre a bien été enregistrée.', 'Abonnement confirmé');
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible d\'enregistrer votre inscription. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS STATE
  if (isSuccess) {
    if (variant === 'footer') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold py-1">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Inscription confirmée !</span>
        </div>
      );
    }

    return (
      <div className={`p-6 rounded-3xl bg-success-surface border border-success-border text-center space-y-2 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-success-surface text-success flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-black text-success">Vous êtes bien inscrit !</h4>
        <p className="text-xs text-success max-w-sm mx-auto">
          Vous recevrez nos sélections et bons plans. Vous pourrez vous désabonner en 1 clic à tout moment.
        </p>
      </div>
    );
  }

  // FOOTER COMPACT VARIANT
  if (variant === 'footer') {
    return (
      <form onSubmit={handleSubmit} className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-1.5 max-w-sm">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre adresse email"
              aria-label="Votre adresse email"
              autoComplete="email"
              disabled={isSubmitting}
              className="w-full h-control-md pl-9 pr-3 text-xs bg-stone-800 border border-stone-700 text-white rounded-xl placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-control-md px-3.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <span>{isSubmitting ? '...' : 'S\'inscrire'}</span>
          </button>
        </div>
        {errorMessage && (
          <p className="text-micro text-rose-400 font-medium">{errorMessage}</p>
        )}
      </form>
    );
  }

  // HOMEPAGE / BAND VARIANT
  return (
    <div
      className={`bg-stone-900 text-white rounded-3xl p-6 sm:p-10 shadow-md relative overflow-hidden ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-6 space-y-2 text-left">
          {/* On the dark band the light-surface primary is unreadable (3.5:1),
              so this uses the inverse-surface brand variant. */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary-on-dark text-xs font-bold">
            <Mail className="w-3.5 h-3.5" />
            <span>La sélection Shongre</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Recevez nos meilleures pépites & bons plans
          </h2>

          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
            Chaque semaine, une sélection exclusive d'annonces vérifiées, de baisses de prix et de conseils pour vos achats et ventes.
          </p>
        </div>

        <div className="lg:col-span-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Saisissez votre adresse email"
                  aria-label="Votre adresse email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="w-full h-12 pl-11 pr-4 text-xs sm:text-sm bg-stone-800 border border-stone-700 text-white rounded-2xl placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="font-black shrink-0 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Inscription...' : 'S\'inscrire'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {showConsentCheckbox && (
              <label className="flex items-start gap-2 cursor-pointer select-none text-micro text-stone-400 min-h-6">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-3.5 h-3.5 shrink-0 rounded text-primary focus:ring-primary border-stone-700 bg-stone-800 mt-0.5"
                />
                <span>
                  J'accepte de recevoir la newsletter Shongre. Désinscription possible à tout moment en 1 clic.
                </span>
              </label>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
