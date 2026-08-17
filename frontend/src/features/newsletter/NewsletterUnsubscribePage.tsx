import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../design-system/primitives/Button';
import { FormField, Input } from '../../design-system/primitives/FormField';
import { newsletterRepository } from '../../repositories/newsletter.repository';
import { newsletterService } from '../../domains/newsletter/newsletter.service';
import { useToast } from '../../app/providers/ToastProvider';

export const NewsletterUnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = newsletterService.validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error || 'Email invalide.');
      return;
    }

    setIsSubmitting(true);
    try {
      await newsletterRepository.unsubscribe(email.trim());
      setIsUnsubscribed(true);
      toast.info('Vous êtes désabonné de la newsletter.', 'Désinscription confirmée');
    } catch (err: any) {
      // In demo mode or if email wasn't found, still show confirmation to prevent enumeration
      setIsUnsubscribed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubscribe = async () => {
    setIsSubmitting(true);
    try {
      await newsletterRepository.subscribe({ email: email.trim() });
      setIsUnsubscribed(false);
      toast.success('Votre réabonnement a bien été pris en compte.', 'Réabonné');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du réabonnement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white border border-border-base rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-stone-900">
            Désabonnement Newsletter
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Vous pouvez vous désabonner en 1 clic de l'ensemble de nos sélections et bons plans.
          </p>
        </div>

        {isUnsubscribed ? (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs space-y-1 text-left">
              <span className="font-bold block flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Désabonnement pris en compte
              </span>
              <p className="text-emerald-800 leading-relaxed">
                L'adresse <strong>{email}</strong> ne recevra plus nos communications promotionnelles.
              </p>
            </div>

            <div className="p-4 bg-stone-50 border border-border-base rounded-2xl text-micro text-stone-500 text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Vous continuerez à recevoir les notifications nécessaires relatives à la sécurité de votre compte et à vos transactions en cours.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Button variant="outline" size="sm" fullWidth onClick={handleResubscribe} disabled={isSubmitting}>
                Je me suis trompé, me réabonner
              </Button>
              <Button variant="primary" fullWidth onClick={() => navigate('/')} className="font-bold">
                Retour à l'accueil
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="space-y-4 text-left">
            <FormField label="Votre adresse email" required error={error || undefined}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.fr"
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? 'Désinscription...' : 'Confirmer le désabonnement'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
