import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { authService } from '../../domains/auth/auth.service';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { PasswordField } from './components/PasswordField';
import { AuthLayout } from './components/AuthLayout';
import { routes } from '../../configuration/routes';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const urlToken = searchParams.get('token') || '';

  const [step, setStep] = useState<'request' | 'reset'>(urlToken ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoResetToken, setDemoResetToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.requestPasswordReset(email.trim());
      if (res.success) {
        setSuccessMessage(res.message);
        if (res.demoToken) {
          setDemoResetToken(res.demoToken);
          setToken(res.demoToken);
        }
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la demande.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword(token.trim(), newPassword);
      if (res.success) {
        toast.success('Votre mot de passe a été mis à jour ! Vous pouvez vous connecter.');
        navigate('/connexion');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 'request' ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
      subtitle={
        step === 'request'
          ? 'Recevez un lien de réinitialisation sécurisé par email'
          : 'Définissez votre nouveau mot de passe d\'accès sécurisé'
      }
      footerLink={{
        text: 'Vous vous souvenez de votre mot de passe ?',
        linkText: 'Se connecter',
        to: '/connexion',
      }}
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successMessage && step === 'request' && (
        <div className="mb-5 p-4 rounded-xl bg-success-surface border border-success-border text-xs text-success space-y-2">
          <div className="flex items-start gap-2 font-bold text-success">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>

          {demoResetToken && (
            <div className="pt-2 border-t border-success-border/80">
              <p className="text-micro text-success mb-1.5 font-medium">
                Environnement de démonstration — Cliquez ci-dessous pour procéder immédiatement à la réinitialisation :
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => setStep('reset')}
              >
                Accéder au formulaire de nouveau mot de passe
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-xs font-bold text-stone-800 mb-1.5">
              Adresse email de votre compte <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.fr"
                required
                autoComplete="email"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-primary"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Envoyer le lien de réinitialisation
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Jeton de validation (Token) <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Collez le token reçu par email"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:border-primary"
              />
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <PasswordField
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              label="Nouveau mot de passe"
              showStrength
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Confirmer le nouveau mot de passe <span className="text-primary">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-primary"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Mettre à jour mon mot de passe
          </Button>

          <button
            type="button"
            onClick={() => setStep('request')}
            className="w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-900 py-1"
          >
            ← Renvoyer un nouvel email
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
