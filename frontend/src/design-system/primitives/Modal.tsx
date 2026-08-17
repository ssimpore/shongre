import React from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useDialogBehavior } from './useDialogBehavior';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className = '',
}) => {
  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidths[maxWidth]} max-h-[calc(100dvh-2rem)] flex flex-col bg-white rounded-3xl shadow-2xl border border-border-base overflow-hidden animate-in zoom-in-95 ${className}`}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border-subtle shrink-0">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-lg font-bold text-stone-900">
                {title}
              </h2>
            )}
            {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
          </div>
          <IconButton ariaLabel="Fermer" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'right';
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
  className = '',
}) => {
  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border-base max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom pb-safe sm:pb-0 ${className}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0">
          {title ? (
            <h2 id={titleId} className="text-base font-bold text-stone-900">
              {title}
            </h2>
          ) : (
            <div />
          )}
          <IconButton ariaLabel="Fermer" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
