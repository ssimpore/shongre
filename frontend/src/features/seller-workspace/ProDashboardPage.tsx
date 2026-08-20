import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Eye,
  MessageSquare,
  DollarSign,
  
  
  ArrowUpRight,
  BarChart2,
  
  FileText
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { listingRepository } from '../../repositories/listing.repository';
import { Listing } from '../../types';
import { formatPrice } from '../../utilities/formatters';
import { Badge } from '../../design-system/primitives/Badge';
import { Button } from '../../design-system/primitives/Button';
import { Link } from 'react-router-dom';
import { BillingHistoryModal } from './components/BillingHistoryModal';
import { Image } from '../../design-system/primitives/Image';
import { useTranslation } from '../../i18n/I18nProvider';

function getPhotoUrl(photo: any): string {
  if (typeof photo === 'string') return photo;
  if (photo && typeof photo.url === 'string') return photo.url;
  return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80';
}

export const ProDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    listingRepository.getListingsBySeller(currentUser.id).then((items) => {
      setListings(items || []);
    }).catch(() => {
      setListings([]);
    });
  }, [currentUser?.id]);

  const totalViews = listings.reduce((acc, l) => acc + (l.viewsCount ?? l.viewCount ?? 0), 0);

  const weeklyStats = [
    { day: 'Lun', views: 240, leads: 12 },
    { day: 'Mar', views: 310, leads: 18 },
    { day: 'Mer', views: 420, leads: 24 },
    { day: 'Jeu', views: 390, leads: 19 },
    { day: 'Ven', views: 560, leads: 32 },
    { day: 'Sam', views: 680, leads: 41 },
    { day: 'Dim', views: 720, leads: 48 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900">{t('sellerworkspace.proDashboardPage.tableauDeBordVendeurPro')}</h1>
            <Badge variant="pro" size="sm">{t('sellerworkspace.proDashboardPage.siretVerifie')}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{t('sellerworkspace.proDashboardPage.suiviDesPerformancesDeVotre')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBillingModalOpen(true)}
            leftIcon={<FileText className="w-4 h-4" />}
          >{t('sellerworkspace.proDashboardPage.facturesRecus')}</Button>

          <Link
            to={`/boutique/${currentUser?.storeSlug || 'atelier-nordique-sas'}`}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            <span>Voir ma vitrine en ligne</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Vues totales catalogue</span>
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalViews.toLocaleString()}</div>
          <div className="text-xs text-success font-bold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +18.4% cette semaine
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Demandes & Contacts</span>
            <MessageSquare className="w-4 h-4 text-info" />
          </div>
          <div className="text-2xl font-black text-stone-900">194</div>
          <div className="text-xs text-success font-bold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +12.1%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('sellerworkspace.proDashboardPage.tauxDeConversion')}</span>
            <BarChart2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">5.8%</div>
          <div className="text-xs text-stone-500 mt-1">{t('sellerworkspace.proDashboardPage.surLesFichesArticles')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('sellerworkspace.proDashboardPage.volumeDeVentesEstime')}</span>
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-black text-stone-900">{formatPrice(14250)}</div>
          <div className="text-xs text-stone-500 mt-1">{t('sellerworkspace.proDashboardPage.ceMoisCi')}</div>
        </div>
      </div>

      {/* Analytics Chart Bar Visualizer */}
      <div className="bg-white rounded-2xl border border-border-base p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-stone-900">{t('sellerworkspace.proDashboardPage.evolutionDeLAudience7')}</h2>
          <span className="text-xs text-stone-500">Total : 3 320 vues uniques</span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 border-b border-border-subtle">
          {weeklyStats.map((item) => {
            const heightPercent = (item.views / 750) * 100;
            return (
              <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="text-micro font-bold text-stone-600">{item.views}</div>
                <div
                  className="w-full max-w-[40px] bg-gradient-to-t from-primary to-orange-400 rounded-t-lg transition-all duration-normal hover:opacity-90 shadow-2xs"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-xs font-bold text-stone-500">{item.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top performing articles */}
      <div className="bg-white rounded-2xl border border-border-base p-6 shadow-xs space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-stone-900">{t('sellerworkspace.proDashboardPage.articlesPharesDeVotreBoutique')}</h2>

        <div className="divide-y divide-border-subtle">
          {listings.slice(0, 5).map((l) => (
            <div key={l.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Image
                  src={getPhotoUrl(l.coverImageUrl || l.photos?.[0])}
                  alt=""
                  sizes="48px"
                  className="w-12 h-12 rounded-lg object-cover border border-border-base shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                    {l.title}
                  </div>
                  <div className="text-xs text-stone-500">{formatPrice(l.price)}</div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-stone-600 shrink-0">
                <div className="text-right">
                  <div className="font-bold text-stone-900">{l.viewsCount ?? l.viewCount ?? 0}</div>
                  <div className="text-micro text-stone-500">Vues</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-success">8.2%</div>
                  <div className="text-micro text-stone-500">Conversion</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BillingHistoryModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        userType="professional"
      />
    </div>
  );
};
