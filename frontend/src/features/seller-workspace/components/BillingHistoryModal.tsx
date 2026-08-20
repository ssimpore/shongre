import React, { useState } from 'react';
import { FileText, Download     } from 'lucide-react';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { Badge } from '../../../design-system/primitives/Badge';
import { useToast } from '../../../app/providers/ToastProvider';
import { formatPrice } from '../../../utilities/formatters';
import { useTranslation } from '../../../i18n/I18nProvider';

interface BillingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: 'individual' | 'professional';
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string;
  type: 'subscription' | 'boost' | 'escrow_fee';
  amountHt: number;
  vatAmount: number;
  totalTtc: number;
  status: 'paid' | 'pending' | 'refunded';
  paymentMethod: string;
}

const SAMPLE_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-2026-003',
    invoiceNumber: 'FAC-2026-08492',
    date: '2026-02-15T10:30:00.000Z',
    description: 'Forfait Pro Illimité - Mensualité Février 2026',
    type: 'subscription',
    amountHt: 74.17,
    vatAmount: 14.83,
    totalTtc: 89.0,
    status: 'paid',
    paymentMethod: 'CB •••• 4242',
  },
  {
    id: 'inv-2026-002',
    invoiceNumber: 'FAC-2026-07914',
    date: '2026-02-10T14:15:00.000Z',
    description: 'Pack Visibilité Intégrale (14 jours) - Annonce "Canapé Scandinave"',
    type: 'boost',
    amountHt: 12.42,
    vatAmount: 2.48,
    totalTtc: 14.9,
    status: 'paid',
    paymentMethod: 'CB •••• 4242',
  },
  {
    id: 'inv-2026-001',
    invoiceNumber: 'FAC-2026-06102',
    date: '2026-01-15T09:00:00.000Z',
    description: 'Forfait Pro Illimité - Mensualité Janvier 2026',
    type: 'subscription',
    amountHt: 74.17,
    vatAmount: 14.83,
    totalTtc: 89.0,
    status: 'paid',
    paymentMethod: 'CB •••• 4242',
  },
  {
    id: 'inv-2025-012',
    invoiceNumber: 'FAC-2025-11045',
    date: '2025-12-28T16:40:00.000Z',
    description: 'Frais de Séquestre & Protection Acheteur - Commande #SHG-39210',
    type: 'escrow_fee',
    amountHt: 2.92,
    vatAmount: 0.58,
    totalTtc: 3.5,
    status: 'paid',
    paymentMethod: 'CB •••• 1122',
  },
];

export const BillingHistoryModal: React.FC<BillingHistoryModalProps> = ({
  isOpen,
  onClose,
  userType = 'individual',
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [filterType, setFilterType] = useState<'all' | 'subscription' | 'boost' | 'escrow_fee'>('all');

  const filteredInvoices = SAMPLE_INVOICES.filter((inv) => {
    if (filterType === 'all') return true;
    return inv.type === filterType;
  });

  const handleDownloadPdf = (invoice: InvoiceItem) => {
    // Generate simulated text-based printable invoice / receipt
    const content = `=====================================================
                    FACTURE SHONGRE SAS
=====================================================
Numéro de facture : ${invoice.invoiceNumber}
Date d'émission   : ${new Date(invoice.date).toLocaleDateString('fr-FR')}
Statut            : ACQUITTÉE / PAYÉE

Éditeur :
Shongre SAS - 14 bd Haussmann, 75009 Paris
RCS Paris 912 345 678 - TVA FR82912345678

Détail de la prestation :
- ${invoice.description}
-----------------------------------------------------
Montant Hors Taxes (HT) : ${invoice.amountHt.toFixed(2)} €
TVA applicable (20.0%)  : ${invoice.vatAmount.toFixed(2)} €
-----------------------------------------------------
TOTAL TTC PAYÉ          : ${invoice.totalTtc.toFixed(2)} €
Moyen de paiement       : ${invoice.paymentMethod}
=====================================================
Merci de votre confiance sur Shongre !
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${invoice.invoiceNumber}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Le reçu ${invoice.invoiceNumber} a été téléchargé.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('sellerworkspace.billingHistoryModal.historiqueDeFacturationRecus')}
      description={t('sellerworkspace.billingHistoryModal.consultezEtTelechargezVosFactures')}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Filter bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Toutes les factures' },
            { id: 'subscription', label: 'Abonnements Pro' },
            { id: 'boost', label: 'Packs de visibilité' },
            { id: 'escrow_fee', label: 'Frais de protection' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Invoices list */}
        <div className="divide-y divide-border-subtle rounded-xl border border-border-base bg-white overflow-hidden">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-stone-900 font-mono">
                        {inv.invoiceNumber}
                      </span>
                      <Badge variant="verified" size="sm">{t('sellerworkspace.billingHistoryModal.payee')}</Badge>
                    </div>
                    <div className="text-xs text-stone-700 font-medium mt-0.5">
                      {inv.description}
                    </div>
                    <div className="text-micro text-stone-500 mt-1 flex items-center gap-2">
                      <span>{new Date(inv.date).toLocaleDateString('fr-FR')}</span>
                      <span>•</span>
                      <span>{inv.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                  <div className="text-right">
                    <div className="font-black text-sm text-stone-900">
                      {formatPrice(inv.totalTtc)}
                    </div>
                    <div className="text-micro text-stone-500">
                      dont {formatPrice(inv.vatAmount)} TVA
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(inv)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >{t('sellerworkspace.billingHistoryModal.recu')}</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-stone-500 text-xs">{t('sellerworkspace.billingHistoryModal.aucuneFactureNeCorrespondA')}</div>
          )}
        </div>

        {/* Footer info & close */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-stone-500">
          <span>{t('sellerworkspace.billingHistoryModal.toutesLesFacturesShongreSas')}</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
