import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary" | "success";
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "primary",
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: <ShieldAlert className="w-6 h-6 text-danger" />,
      btnVariant: "primary" as const,
      btnClass: "bg-danger hover:bg-danger text-white",
      bgClass: "bg-danger-surface border-danger-border",
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-warning" />,
      btnVariant: "primary" as const,
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
      bgClass: "bg-warning-surface border-warning-border",
    },
    primary: {
      icon: <Info className="w-6 h-6 text-primary" />,
      btnVariant: "primary" as const,
      btnClass: "",
      bgClass: "bg-primary-light border-primary-border",
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-success" />,
      btnVariant: "primary" as const,
      btnClass: "bg-success hover:bg-success text-white",
      bgClass: "bg-success-surface border-success-border",
    },
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-6">
        <div
          className={`p-4 rounded-card border flex items-start gap-4 shadow-2xs ${iconConfig.bgClass}`}
        >
          <div className="shrink-0 mt-0.5 bg-bg-surface p-1.5 rounded-control shadow-xs border border-border-subtle">
            {iconConfig.icon}
          </div>
          <p className="text-sm text-stone-800 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={iconConfig.btnVariant}
            size="md"
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
