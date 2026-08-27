import React from "react";
import { X } from "lucide-react";
import { IconButton } from "../primitives/IconButton.web";
import { useDialogBehavior } from "../hooks/useDialogBehavior.web";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerIcon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  /** Prevents closing through Escape, the backdrop, or a close button. */
  dismissible?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  headerIcon,
  children,
  maxWidth = "md",
  className = "",
  dismissible = true,
}) => {
  const { containerRef, titleId } = useDialogBehavior(
    isOpen,
    onClose,
    dismissible,
  );

  if (!isOpen) return null;

  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-overlay backdrop-blur-xs"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidths[maxWidth]} max-h-dialog-modal-max-height flex flex-col bg-bg-surface rounded-overlay shadow-overlay border border-border-base overflow-hidden animate-in zoom-in-95 ${className}`}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-border-subtle shrink-0">
          <div className="flex min-w-0 items-start gap-3">
            {headerIcon && <div className="shrink-0">{headerIcon}</div>}
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-bold text-text-main">
                  {title}
                </h2>
              )}
              {description && (
                <div className="text-xs text-text-muted mt-0.5">
                  {description}
                </div>
              )}
            </div>
          </div>
          {dismissible && (
            <IconButton ariaLabel="Fermer" size="sm" onClick={onClose}>
              <X className="w-icon-lg h-icon-lg text-text-muted" />
            </IconButton>
          )}
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "bottom" | "right";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = "bottom",
  className = "",
}) => {
  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const isRight = position === "right";

  return (
    <div
      className={`fixed inset-0 z-modal flex bg-overlay backdrop-blur-xs ${
        isRight
          ? "items-stretch justify-end"
          : "items-end justify-center p-0 sm:items-center sm:p-4"
      }`}
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
        className={`flex w-full flex-col overflow-hidden bg-bg-surface shadow-overlay animate-in ${
          isRight
            ? "h-side-sheet-height sm:w-side-sheet-width sm:max-w-lg sm:border-l border-border-base slide-in-from-right pb-safe"
            : "max-w-lg max-h-dialog-drawer-max-height rounded-t-overlay border border-border-base slide-in-from-bottom pb-safe sm:rounded-overlay sm:pb-0"
        } ${className}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-subtle shrink-0">
          {title ? (
            <h2 id={titleId} className="text-base font-bold text-text-main">
              {title}
            </h2>
          ) : (
            <div />
          )}
          <IconButton ariaLabel="Fermer" size="sm" onClick={onClose}>
            <X className="w-icon-lg h-icon-lg text-text-muted" />
          </IconButton>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
