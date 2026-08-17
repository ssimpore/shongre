import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input, Textarea, FormField } from './FormField';

export interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  placeholder = '',
  initialValue = '',
  confirmText = 'Valider',
  cancelText = 'Annuler',
  multiline = false,
  required = true,
  hint,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) {
      setError('Ce champ est obligatoire.');
      return;
    }
    onSubmit(value.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={label} required={required} hint={hint} error={error || undefined}>
          {multiline ? (
            <Textarea
              rows={4}
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
          ) : (
            <Input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
          )}
        </FormField>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
