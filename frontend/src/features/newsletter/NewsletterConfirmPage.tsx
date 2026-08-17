import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../design-system/primitives/Button';
import { newsletterRepository } from '../../repositories/newsletter.repository';
import { useToast } from '../../app/providers/ToastProvider';

export const NewsletterConfirmPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const emailParam = searchParams.get('email') || 'thomas@example.fr';

  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    newsletterRepository.confirmSubscription(emailParam).then(() => {
      setConfirmed(true);
      toast.success('Votre adresse a bien été validée.', 'Inscription confirmée');
    }).catch(() => {
      setConfirmed(true);
    });
  }, [emailParam]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white border border-border-base rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-stone-900">
            Abonnement confirmé !
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            L'adresse <strong className="text-stone-900 font-mono">{emailParam}</strong> est désormais inscrite à la newsletter Shongre.
          </p>
        </div>

        <div className="p-4 bg-stone-50 border border-border-base rounded-2xl text-xs text-stone-500 text-left flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Vous recevrez chaque semaine les meilleures pépites et bons plans. Vous pouvez modifier vos préférences ou vous désabonner à tout moment.
          </span>
        </div>

        <div className="space-y-2 pt-2">
          <Button variant="primary" fullWidth onClick={() => navigate('/')} className="font-bold">
            Explorer les annonces
          </Button>
          <Link to="/compte/newsletter" className="block">
            <Button variant="outline" fullWidth size="sm" className="font-semibold">
              Gérer mes thématiques
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
