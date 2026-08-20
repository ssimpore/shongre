import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { authService } from '../../../domains/auth/auth.service';
import { Button } from '../../../design-system/primitives/Button';
import { SUPPORTED_MARKETS } from '../../../configuration/market.config';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface PhoneVerificationModalProps {
  userId: string;
  initialPhone?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedPhone: string) => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  userId,
  initialPhone = '',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [phone, setPhone] = useState(initialPhone);
  const [selectedCountry, setSelectedCountry] = useState('FR');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const currentMarket = SUPPORTED_MARKETS[selectedCountry] || SUPPORTED_MARKETS['FR'];

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError('Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `${currentMarket.phonePrefix} ${phone}`;
      const res = authService.sendPhoneCode(userId, fullPhone);
      if (res.success) {
        setStep('otp');
        setCountdown(60);
        setDemoCodeHint(res.demoCode || '123456');
        setSuccessMessage(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du SMS.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otpCode.length < 6) {
      setError('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = authService.verifyPhoneCode(userId, otpCode);
      if (res.success) {
        onSuccess(phone);
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation du code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    const fullPhone = phone.startsWith('+') ? phone : `${currentMarket.phonePrefix} ${phone}`;
    const res = authService.sendPhoneCode(userId, fullPhone);
    if (res.success) {
      setCountdown(60);
      setDemoCodeHint(res.demoCode || '123456');
      setSuccessMessage('Nouveau code envoyé par SMS.');
      setError(null);
    }
  };

  // Escape, focus trap, focus restore and scroll lock — this overlay
  // bypassed the shared Modal primitive and had none of them.
  const { containerRef, titleId } = useDialogBehavior(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-fast"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 id={titleId} className="text-xl font-extrabold text-stone-900 mb-1">{t('auth.phoneVerificationModal.verificationDuNumeroDeTelephone')}</h3>
        <p className="text-xs text-stone-600 mb-5 leading-relaxed">{t('auth.phoneVerificationModal.laVerificationTelephoniqueProtegeLes')}</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && step === 'otp' && (
          <div className="mb-4 p-3 rounded-xl bg-success-surface border border-success-border text-xs font-semibold text-success flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{successMessage}</p>
              {demoCodeHint && (
                <p className="mt-1 text-success font-bold bg-success-surface/80 px-2 py-0.5 rounded inline-block">
                  Code SMS de test : {demoCodeHint}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'input' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">{t('auth.phoneVerificationModal.paysEtIndicatif')}</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="col-span-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {Object.values(SUPPORTED_MARKETS).map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.flag} {m.code} ({m.phonePrefix})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={currentMarket.phonePlaceholder}
                  required
                  className="col-span-2 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >{t('auth.phoneVerificationModal.recevoirMonCodeParSms')}</Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">{t('auth.phoneVerificationModal.saisissezLeCodeRecuPar')}</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                autoFocus
                required
                className="w-full px-4 py-3 text-center tracking-[0.5em] text-xl font-black bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >{t('auth.phoneVerificationModal.confirmerLeNumero')}</Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-stone-500 hover:text-stone-900 font-semibold"
              >{t('auth.phoneVerificationModal.changerDeNumero')}</button>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0}
                className={`flex items-center gap-1 font-bold ${
                  countdown > 0
                    ? 'text-stone-500 cursor-not-allowed'
                    : 'text-primary hover:underline cursor-pointer'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                {countdown > 0 ? `Renvoyer (${countdown}s)` : 'Renvoyer le code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
