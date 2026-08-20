import React, { useState } from 'react';
import { ShieldCheck,   Copy, Check, X, AlertCircle } from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { authService } from '../../../domains/auth/auth.service';
import { Button } from '../../../design-system/primitives/Button';
import { Image } from '../../../design-system/primitives/Image';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface MFAModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MFAModal: React.FC<MFAModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [setupData] = useState(() => authService.generateMFASetup(userId));
  const [code, setCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = authService.enableMFA(userId, code, setupData.backupCodes);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Escape, focus trap, focus restore and scroll lock — this overlay
  // bypassed the shared Modal primitive and had none of them.
  const { containerRef, titleId } = useDialogBehavior(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-fast"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
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

        <div className="w-12 h-12 rounded-xl bg-success-surface text-success flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 id={titleId} className="text-xl font-extrabold text-stone-900 mb-1">{t('auth.mFAModal.activerLaDoubleAuthentification2fa')}</h3>
        <p className="text-xs text-stone-600 mb-5 leading-relaxed">{t('auth.mFAModal.protegezVotreCompteEtVos')}</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Step 1: QR Code */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-xs font-bold text-stone-900 block mb-2">{t('auth.mFAModal.1ScannezCeQrCode')}</span>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Image
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                sizes="128px"
                className="w-32 h-32 rounded-lg border border-stone-300 bg-white p-1"
              />
              <div className="flex-1 min-w-0">
                <span className="text-micro text-stone-500 font-semibold block mb-1">{t('auth.mFAModal.ouSaisissezLaCleManuellement')}</span>
                <div className="flex items-center gap-2">
                  <code className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 select-all">
                    {setupData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                    title={t('auth.mFAModal.copierLaCleSecrete')}
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Backup recovery codes */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-900">{t('auth.mFAModal.2CodesDeSecoursA')}</span>
              <button
                type="button"
                onClick={handleCopyBackupCodes}
                aria-label={t('auth.mFAModal.copierLesCodesDeSecours')}
                className="text-micro font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedBackup ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                {copiedBackup ? 'Copiés' : 'Copier les 8 codes'}
              </button>
            </div>
            <p className="text-micro text-stone-500 mb-2.5">{t('auth.mFAModal.conservezCesCodesDansUn')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {setupData.backupCodes.map((code) => (
                <div
                  key={code}
                  className="px-2 py-1 bg-white border border-stone-200 rounded font-mono text-micro text-center font-bold text-stone-700"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Verification form */}
          <form onSubmit={handleVerify} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">{t('auth.mFAModal.3EntrezLeCodeA')}</label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
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
            >{t('auth.mFAModal.verifierEtActiverLe2fa')}</Button>
          </form>
        </div>
      </div>
    </div>
  );
};
