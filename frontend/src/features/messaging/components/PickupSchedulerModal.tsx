import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { FormField, Input } from '../../../design-system/primitives/FormField';

interface PickupSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, timeSlot: string, address: string) => Promise<void>;
  defaultAddress?: string;
}

export const PickupSchedulerModal: React.FC<PickupSchedulerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultAddress = '',
}) => {
  const [date, setDate] = useState('2026-08-20');
  const [timeSlot, setTimeSlot] = useState('14h00 - 15h00');
  const [address, setAddress] = useState(defaultAddress || 'Place de la Comédie, 34000 Montpellier');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !timeSlot || !address.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(date, timeSlot, address.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Planifier la remise en main propre"
      description="Convenez d'un créneau et d'un lieu sécurisé pour échanger l'article en toute confiance."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <FormField label="Date du rendez-vous" required>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Créneau horaire" required>
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="w-full h-10 px-3 border border-border-base rounded-xl bg-white text-xs font-semibold"
          >
            <option value="10h00 - 12h00">Matinée (10h00 - 12h00)</option>
            <option value="12h00 - 14h00">Pause midi (12h00 - 14h00)</option>
            <option value="14h00 - 16h00">Après-midi (14h00 - 16h00)</option>
            <option value="16h00 - 18h00">Fin d'après-midi (16h00 - 18h00)</option>
            <option value="18h00 - 20h00">Soirée (18h00 - 20h00)</option>
          </select>
        </FormField>

        <FormField label="Lieu de rendez-vous (espace public recommandé)" required>
          <Input
            type="text"
            placeholder="ex: Devant le métro, place publique..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </FormField>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" fullWidth onClick={onClose} type="button">
            Annuler
          </Button>
          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Confirmer le rendez-vous
          </Button>
        </div>
      </form>
    </Modal>
  );
};
