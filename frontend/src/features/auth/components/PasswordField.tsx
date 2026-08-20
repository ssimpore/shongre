import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface PasswordFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Pass `null` when the caller renders its own label — the login form pairs
   * one with a "forgot password" link on the same row. Omitting the prop keeps
   * the default label, so the field is never accidentally unlabelled.
   */
  label?: string | null;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  showStrength?: boolean;
  error?: string;
  disabled?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id = 'password',
  name = 'password',
  value,
  onChange,
  label = 'Mot de passe',
  placeholder = '••••••••••••',
  required = true,
  autoComplete = 'current-password',
  showStrength = false,
  error,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  // Strength rules
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  const score = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  let strengthLabel = 'Faible';
  let strengthColor = 'bg-danger text-danger';
  let strengthPercent = 20;

  if (score >= 4) {
    strengthLabel = 'Très robuste';
    strengthColor = 'bg-success text-success';
    strengthPercent = 100;
  } else if (score === 3) {
    strengthLabel = 'Bon';
    strengthColor = 'bg-primary text-primary';
    strengthPercent = 75;
  } else if (score === 2) {
    strengthLabel = 'Moyen';
    strengthColor = 'bg-amber-500 text-warning';
    strengthPercent = 50;
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-stone-800 mb-1.5">
          {label} {required && <span className="text-primary">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 pr-11 bg-white border rounded-xl text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
            error
              ? 'border-danger focus:border-danger bg-danger-surface/20'
              : 'border-stone-200 focus:border-primary'
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <p className="mt-1 text-xs font-semibold text-danger flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {showStrength && value.length > 0 && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
          <div className="flex items-center justify-between font-bold mb-1.5">
            <span className="text-stone-500">{t('auth.passwordField.robustesseDuMotDePasse')}</span>
            <span className={strengthColor.split(' ')[1]}>{strengthLabel}</span>
          </div>

          <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-normal ${strengthColor.split(' ')[0]}`}
              style={{ width: `${strengthPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-1 text-micro text-stone-600">
            <div className="flex items-center gap-1">
              {hasMinLength ? (
                <Check className="w-3 h-3 text-success shrink-0" />
              ) : (
                <X className="w-3 h-3 text-stone-300 shrink-0" />
              )}
              <span>{t('auth.passwordField.8CaracteresMinimum')}</span>
            </div>
            <div className="flex items-center gap-1">
              {hasUppercase ? (
                <Check className="w-3 h-3 text-success shrink-0" />
              ) : (
                <X className="w-3 h-3 text-stone-300 shrink-0" />
              )}
              <span>1 lettre majuscule</span>
            </div>
            <div className="flex items-center gap-1">
              {hasNumber ? (
                <Check className="w-3 h-3 text-success shrink-0" />
              ) : (
                <X className="w-3 h-3 text-stone-300 shrink-0" />
              )}
              <span>1 chiffre</span>
            </div>
            <div className="flex items-center gap-1">
              {hasSpecial ? (
                <Check className="w-3 h-3 text-success shrink-0" />
              ) : (
                <X className="w-3 h-3 text-stone-300 shrink-0" />
              )}
              <span>{t('auth.passwordField.1CaractereSpecial')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
