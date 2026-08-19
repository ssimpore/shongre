import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, AlertCircle, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { authService } from '../../domains/auth/auth.service';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { AuthLayout } from './components/AuthLayout';
import { routes } from '../../configuration/routes';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, refreshUser } = useAuth();

  const urlToken = searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(urlToken ? 'verifying' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  useEffect(() => {
    if (urlToken) {
      handleVerify(urlToken);
    }
  }, [urlToken]);

  const handleVerify = async (tokenToVerify: string) => {
    setStatus('verifying');
    setErrorMessage(null);

    try {
      const res = await authService.verifyEmail(tokenToVerify.trim());
      if (res.success) {
        setStatus('success');
        refreshUser();
        toast.success('Votre adresse email a été confirmée avec succès !');
      } else {
        setStatus('error');
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Erreur lors de la validation.');
    }
  };

  const handleResendVerification = () => {
    if (!currentUser) {
      setErrorMessage('Vous devez être connecté pour demander un nouveau lien de validation.');
      return;
    }

    const res = authService.resendEmailVerification(currentUser.email);
    if (res.success) {
      setResendStatus('Un nouvel email de confirmation vient d\'être envoyé.');
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <AuthLayout
      title="Vérification d'adresse email"
      subtitle="Confirmez votre adresse email pour sécuriser votre compte et activer toutes les fonctionnalités"
      footerLink={{
        text: 'Retourner à votre compte ?',
        linkText: 'Mon tableau de bord',
        to: '/compte',
      }}
    >
      {status === 'success' ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-success-surface text-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-black text-stone-900">
            Email validé avec succès !
          </h2>
          <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
            Votre compte est désormais sécurisé et votre badge "Email Vérifié" est actif sur votre profil.
          </p>

          <div className="pt-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate('/compte')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Accéder à mon espace
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {resendStatus && (
            <div className="p-3.5 rounded-xl bg-success-surface border border-success-border text-xs text-success flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>{resendStatus}</span>
              </div>
              {demoCodeHint && (
                <p className="text-micro text-success">
                  Token démo : <code className="bg-success-surface px-1 py-0.5 rounded font-bold">{demoCodeHint}</code>
                </p>
              )}
            </div>
          )}

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Consultez la boîte de réception de votre adresse email{' '}
              {currentUser?.email && <strong className="text-stone-900">{currentUser.email}</strong>}. Cliquez sur le lien reçu ou collez le jeton de validation ci-dessous.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(tokenInput);
            }}
            className="space-y-3 pt-2"
          >
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                Jeton de validation ou Code de vérification
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Collez ici votre jeton de validation"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={status === 'verifying'}
            >
              Valider mon adresse email
            </Button>
          </form>

          {currentUser && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renvoyer un email de validation</span>
              </button>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
};
