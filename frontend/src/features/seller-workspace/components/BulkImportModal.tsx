import React, { useState } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, Sparkles  } from 'lucide-react';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { Badge } from '../../../design-system/primitives/Badge';
import { useToast } from '../../../app/providers/ToastProvider';
import { listingRepository } from '../../../repositories/listing.repository';
import { formatPrice } from '../../../utilities/formatters';
import { UserProfile } from '../../../types';
import { useTranslation } from '../../../i18n/I18nProvider';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onImportCompleted: () => void;
}

interface ParsedListingItem {
  id: string;
  title: string;
  categorySlug: string;
  subCategorySlug: string;
  price: number;
  condition: string;
  stock: number;
  city: string;
  postalCode: string;
  isValid: boolean;
  validationError?: string;
}

const SAMPLE_CSV_DATA = `Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description
Table basse chêne massif;home_garden;furniture;180;very_good;2;Lyon;69002;Superbe table basse en chêne massif huilé, pieds métal noir.
Lot 4 chaises scandinaves;home_garden;furniture;120;new_without_tag;4;Lyon;69002;Chaises design scandinave tissu gris chiné neuves.
Lampadaire trépied vintage;home_garden;furniture;65;very_good;1;Lyon;69002;Lampadaire esprit projecteur de cinéma avec variateur.
Miroir mural doré baroque;home_garden;furniture;95;good;1;Lyon;69002;Grand miroir moulure dorée 120x80cm.`;

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onImportCompleted,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [, setCsvContent] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ParsedListingItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_DATA], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_import_annonces_shongre.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Le modèle CSV a été téléchargé.');
  };

  const handleLoadSample = () => {
    setCsvContent(SAMPLE_CSV_DATA);
    parseCsv(SAMPLE_CSV_DATA);
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length <= 1) {
      setParsedItems([]);
      return;
    }

    const items: ParsedListingItem[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(';').map((c) => c.trim());
      const title = cols[0] || '';
      const categorySlug = cols[1] || 'home_garden';
      const subCategorySlug = cols[2] || 'furniture';
      const price = parseFloat(cols[3]) || 0;
      const condition = cols[4] || 'very_good';
      const stock = parseInt(cols[5], 10) || 1;
      const city = cols[6] || currentUser.city || 'Paris';
      const postalCode = cols[7] || currentUser.postalCode || '75000';

      const isValid = title.length >= 5 && price > 0;
      const validationError = !title ? 'Titre obligatoire' : title.length < 5 ? 'Titre trop court (< 5 car.)' : price <= 0 ? 'Prix invalide' : undefined;

      items.push({
        id: `parsed-${i}`,
        title,
        categorySlug,
        subCategorySlug,
        price,
        condition,
        stock,
        city,
        postalCode,
        isValid,
        validationError,
      });
    }

    setParsedItems(items);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validItems = parsedItems.filter((i) => i.isValid);
    if (validItems.length === 0) return;

    setIsImporting(true);
    try {
      for (const item of validItems) {
        await listingRepository.createListing({
          title: item.title,
          description: `Article importé depuis le catalogue professionnel de ${currentUser.companyName || currentUser.name}.`,
          price: item.price,
          isNegotiable: false,
          isFreeDonation: false,
          categorySlug: item.categorySlug,
          subCategorySlug: item.subCategorySlug,
          categoryLabel: 'Maison & Jardin',
          subCategoryLabel: 'Mobilier',
          condition: item.condition as any,
          sellerId: currentUser.id,
          sellerName: currentUser.companyName || currentUser.name,
          sellerType: 'pro',
          sellerAvatarUrl: currentUser.avatarUrl,
          sellerRating: currentUser.rating || 5,
          sellerReviewCount: currentUser.reviewCount || 0,
          sellerIsVerified: true,
          sellerCity: item.city,
          sellerPostalCode: item.postalCode,
          city: item.city,
          postalCode: item.postalCode,
          department: 'Rhône',
          region: 'Auvergne-Rhône-Alpes',
          photos: [
            {
              id: `p-${Date.now()}-${Math.random()}`,
              url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
              isCover: true,
            },
          ],
          coverImageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
          deliveryOptions: [
            { type: 'hand_delivery', available: true, price: 0 },
            { type: 'home_delivery', available: true, price: 14.9, courierName: 'Colissimo' },
          ],
          isOnlinePaymentAvailable: true,
          isReservable: true,
          attributes: { stock_quantity: item.stock },
          status: 'active',
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      toast.success(`${validItems.length} annonces importées et publiées en ligne avec succès !`);
      onImportCompleted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import des annonces");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedItems.filter((i) => i.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('sellerworkspace.bulkImportModal.importMassifDeCatalogueCsv')}
      description={t('sellerworkspace.bulkImportModal.importezSimultanementDesDizainesD')}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-border-subtle">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >{t('sellerworkspace.bulkImportModal.modeleCsvVierge')}</Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
            >{t('sellerworkspace.bulkImportModal.chargerUnExemple4Articles')}</Button>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors shadow-xs">
              <Upload className="w-3.5 h-3.5" />{t('sellerworkspace.bulkImportModal.parcourirUnFichierCsv')}</span>
          </label>
        </div>

        {/* CSV preview table */}
        {parsedItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-600 font-bold">
              <span>{parsedItems.length} lignes détectées ({validCount} valides) :</span>
              {validCount < parsedItems.length && (
                <span className="text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {parsedItems.length - validCount} ligne(s) invalide(s)
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border border-border-base rounded-xl divide-y divide-border-subtle text-xs bg-white">
              {parsedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-2.5 flex items-center justify-between gap-3 ${
                    !item.isValid ? 'bg-danger-surface/50' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-stone-400 text-micro w-4">#{idx + 1}</span>
                    <span className="font-bold text-stone-900 truncate max-w-xs">{item.title}</span>
                    <Badge variant="neutral" size="sm">Qté: {item.stock}</Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-stone-900">{formatPrice(item.price)}</span>
                    {item.isValid ? (
                      <Badge variant="verified" size="sm">Valide</Badge>
                    ) : (
                      <Badge variant="urgent" size="sm">{item.validationError}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-stone-200 rounded-2xl text-center space-y-2 bg-stone-50/50">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-stone-400" />
            <h4 className="font-bold text-stone-800 text-sm">{t('sellerworkspace.bulkImportModal.deposezVotreFichierCsvIci')}</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">{t('sellerworkspace.bulkImportModal.utilisezNotreModeleAvecSeparateur')}</p>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Annuler
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={validCount === 0 || isImporting}
            isLoading={isImporting}
            onClick={handleExecuteImport}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Importer et publier {validCount} annonce{validCount > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
