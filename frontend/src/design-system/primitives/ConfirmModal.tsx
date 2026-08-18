import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'primary',
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: <ShieldAlert className="w-6 h-6 text-danger" />,
      btnVariant: 'primary' as const,
      btnClass: 'bg-danger hover:bg-danger text-white',
      bgClass: 'bg-danger-surface border-danger-border',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-warning" />,
      btnVariant: 'primary' as const,
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      bgClass: 'bg-warning-surface border-warning-border',
    },
    primary: {
      icon: <Info className="w-6 h-6 text-primary" />,
      btnVariant: 'primary' as const,
      btnClass: '',
      bgClass: 'bg-primary-light border-primary-border',
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-success" />,
      btnVariant: 'primary' as const,
      btnClass: 'bg-success hover:bg-success text-white',
      bgClass: 'bg-success-surface border-success-border',
    },
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-5">
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${iconConfig.bgClass}`}>
          <div className="shrink-0 mt-0.5">{iconConfig.icon}</div>
          <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={iconConfig.btnVariant}
            size="sm"
            className={iconConfig.btnClass}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
