import { isProSeller } from '../../domains/user/user.domain';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  List,
  Heart,
  Search,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  Clock,
  ArrowRight,
  Shield,
  Smartphone,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ExternalLink,
  Edit3,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { listingRepository } from '../../repositories/listing.repository';
import { messagingRepository } from '../../repositories/messaging.repository';
import { storageService } from '../../services/storage.service';
import { formatPrice } from '../../utilities/formatters';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { useToast } from '../../app/providers/ToastProvider';
import { PhoneVerificationModal } from '../auth/components/PhoneVerificationModal';
import { MFAModal } from '../auth/components/MFAModal';
import { UpgradeToProModal } from '../auth/components/UpgradeToProModal';
import { BillingHistoryModal } from './components/BillingHistoryModal';
import { Image } from '../../design-system/primitives/Image';
import { Listing } from '../../types';
import { usePublishCta } from '../../security/usePublishCta';

function getPhotoUrl(photo: any): string {
  if (typeof photo === 'string') return photo;
  if (photo && typeof photo.url === 'string') return photo.url;
  return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80';
}

export const AccountOverviewPage: React.FC = () => {
  const { currentUser, isEmailVerified, isPhoneVerified, refreshUser, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const publishCta = usePublishCta();

  // A verified flag with no number on file is not a verified phone — showing the
  // badge on its own contradicts the "Non renseigné" value rendered right below it.
  const hasVerifiedPhone = isPhoneVerified && Boolean(currentUser?.phone);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Profile Edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [savedSearchCount, setSavedSearchCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;

    listingRepository.getListingsBySeller(currentUser.id).then((items) => {
      setMyListings(items || []);
    }).catch(() => {
      setMyListings([]);
    });

    listingRepository.getFavorites().then((favs) => {
      setFavCount(favs.length);
    }).catch(() => {
      setFavCount(0);
    });

    try {
      setSavedSearchCount(storageService.getSavedSearches().length);
    } catch {
      setSavedSearchCount(0);
    }

    messagingRepository.getUserConversations(currentUser.id).then((convs) => {
      const unread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadMsgCount(unread);
    }).catch(() => {
      setUnreadMsgCount(0);
    });
  }, [currentUser?.id]);

  const activeListings = myListings.filter((l) => l.status === 'active');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        phone,
        city,
        postalCode,
        bio,
      });
      refreshUser();
      setIsEditingProfile(false);
      toast.success('Vos coordonnées ont été mises à jour !');
    } catch {
      toast.error('Erreur lors de la sauvegarde du profil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg font-bold">
              <span className="text-sm font-normal text-stone-300">Bonjour, </span>
              {currentUser?.name}
            </h1>
            {isProSeller(currentUser) && <Badge variant="pro" size="sm">Compte Pro</Badge>}
            {currentUser?.isVerified && <Badge variant="verified" size="sm" icon>Vérifié</Badge>}
          </div>
          <p className="text-xs text-stone-300">
            Gérez vos annonces, vos ventes, vos messages et vos favoris en toute simplicité.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to={
              isProSeller(currentUser)
                ? `/boutique/${currentUser.storeSlug || currentUser.slug || currentUser.id}`
                : `/profil/${currentUser?.slug || currentUser?.id}`
            }
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 border border-white/20"
          >
            <ShieldCheck className="w-4 h-4" />
            {isProSeller(currentUser) ? 'Voir ma boutique publique' : 'Voir mon profil public'}
          </Link>

          <Link
            to={publishCta.to}
            className="bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Déposer une annonce
          </Link>
        </div>
      </div>

      {/* Trust & Security Hub */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            <h2 className="font-extrabold text-sm sm:text-base text-stone-900">
              Niveaux de sécurité & Vérifications du compte
            </h2>
          </div>
          <Link
            to="/compte/verification"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
          >
            Centre de Vérification (KYC / KYB / IBAN) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Email Verification */}
          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-3 h-3" /> Vérifié
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-warning bg-warning-surface px-2 py-0.5 rounded-md border border-warning-border">
                    <AlertCircle className="w-3 h-3" /> En attente
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">Adresse Email</h3>
              <p className="text-micro text-stone-600 truncate mt-0.5">
                {currentUser?.email}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200/60">
              {isEmailVerified ? (
                <span className="text-micro text-stone-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-success" /> Notifications actives
                </span>
              ) : (
                <Link
                  to="/verification-email"
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
                >
                  Confirmer mon email →
                </Link>
              )}
            </div>
          </div>

          {/* Phone Verification */}
          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-success-surface text-success flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                {hasVerifiedPhone ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-3 h-3" /> Vérifié SMS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                    Non vérifié
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">Numéro de téléphone</h3>
              <p className="text-micro text-stone-600 truncate mt-0.5">
                {currentUser?.phone || 'Non renseigné'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6 cursor-pointer"
              >
                {hasVerifiedPhone ? 'Modifier / Re-vérifier' : 'Vérifier par SMS (6 chiffres) →'}
              </button>
            </div>
          </div>

          {/* MFA 2FA */}
          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                {currentUser?.mfaEnabled ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-3 h-3" /> 2FA Actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                    Désactivé
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">Double Authentification</h3>
              <p className="text-micro text-stone-600 mt-0.5">
                Protection renforcée Google/Microsoft Auth
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => setShowMfaModal(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6 cursor-pointer"
              >
                {currentUser?.mfaEnabled ? 'Gérer les codes de secours' : 'Activer le 2FA →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/compte/annonces"
          className="bg-white p-4 rounded-xl border border-border-base hover:border-primary transition-all shadow-xs block"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-2">
            <List className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900">{activeListings.length}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">Annonces actives</div>
        </Link>

        <Link
          to="/compte/messages"
          className="bg-white p-4 rounded-xl border border-border-base hover:border-primary transition-all shadow-xs block"
        >
          <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center mb-2">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900">{unreadMsgCount}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">Nouveau message{unreadMsgCount > 1 ? 's' : ''}</div>
        </Link>

        <Link
          to="/compte/favoris"
          className="bg-white p-4 rounded-xl border border-border-base hover:border-primary transition-all shadow-xs block"
        >
          <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-2">
            <Heart className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900">{favCount}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">Annonces sauvegardées</div>
        </Link>

        {/* This card opens the billing history — it is an action, not a metric.
            It used to put the word "Factures" in the same 2xl-black slot the
            three cards beside it use for a count, so it scanned as a broken
            statistic. Same footprint, anatomy that matches what it does. */}
        <button
          type="button"
          onClick={() => setShowBillingModal(true)}
          className="bg-white p-4 rounded-xl border border-border-base hover:border-primary transition-all shadow-xs text-left cursor-pointer group flex flex-col"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div className="mt-auto">
            <div className="text-sm font-bold text-stone-900 flex items-center gap-1">
              Factures
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-0.5">Reçus &amp; justificatifs</div>
          </div>
        </button>
      </div>

      {/* Profile details & Edit mode */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">
              Coordonnées & Informations du profil
            </h2>
            <p className="text-xs text-stone-500">
              Visibles sur vos annonces et lors des remises en main propre
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="inline-flex items-center gap-1.5 min-h-6 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditingProfile ? 'Fermer' : 'Modifier mes informations'}
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nom et prénom / Pseudonyme
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Code Postal
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="75011"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Biographie / Présentation
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Présentez-vous brièvement aux autres membres de la communauté..."
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
              >
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Nom / Pseudo</span>
              <span className="font-bold text-stone-900">{currentUser?.name}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Email</span>
              <span className="font-bold text-stone-900 truncate block">{currentUser?.email}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Téléphone</span>
              <span className="font-bold text-stone-900">{currentUser?.phone || 'Non renseigné'}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Localisation</span>
              <span className="font-bold text-stone-900">
                {currentUser?.postalCode ? `${currentUser.postalCode} ` : ''}
                {currentUser?.city || 'France'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* My Active Listings Widget */}
      <div className="bg-white rounded-2xl border border-border-base p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-stone-900">
            Mes dernières annonces ({myListings.length})
          </h2>
          <Link
            to="/compte/annonces"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
          >
            Toutes mes annonces →
          </Link>
        </div>

        {myListings.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {myListings.slice(0, 4).map((listing) => {
              const photoUrl = getPhotoUrl(listing.coverImageUrl || listing.photos?.[0]);
              return (
                <div key={listing.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Image
                      src={photoUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover border border-border-base shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/annonce/${listing.id}`}
                        className="font-bold text-xs sm:text-sm text-stone-900 hover:text-primary truncate block"
                      >
                        {listing.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span className="font-bold text-stone-900">{formatPrice(listing.price)}</span>
                        <span>•</span>
                        <span>{listing.city}</span>
                        <span>•</span>
                        <span>{listing.viewsCount ?? listing.viewCount ?? 0} vues</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={listing.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {listing.status === 'active' ? 'En ligne' : 'Vendu'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500 text-xs">
            Vous n'avez pas encore publié d'annonce.
          </div>
        )}
      </div>

      {/* Pro solutions callout */}
      {!isProSeller(currentUser) && (
        <div className="bg-primary-light border border-primary-border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="w-4 h-4" />
              Passez à la vitesse supérieure
            </div>
            <h2 className="font-black text-stone-900 text-sm sm:text-base">
              Vous vendez régulièrement en tant que professionnel ?
            </h2>
            <p className="text-xs text-stone-600">
              Profitez d'une boutique dédiée avec votre logo, du badge Pro vérifié et de remises sur les boosts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowProModal(true)}
            className="bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Passer en Compte Pro
          </button>
        </div>
      )}

      {/* Modals */}
      {currentUser && (
        <>
          <PhoneVerificationModal
            userId={currentUser.id}
            initialPhone={currentUser.phone}
            isOpen={showPhoneModal}
            onClose={() => setShowPhoneModal(false)}
            onSuccess={(verifiedPhone) => {
              refreshUser();
              toast.success(`Numéro ${verifiedPhone} vérifié avec succès !`);
            }}
          />

          <MFAModal
            userId={currentUser.id}
            isOpen={showMfaModal}
            onClose={() => setShowMfaModal(false)}
            onSuccess={() => {
              refreshUser();
              toast.success('Double authentification (2FA) activée avec succès !');
            }}
          />

          <UpgradeToProModal
            isOpen={showProModal}
            onClose={() => setShowProModal(false)}
            onSuccess={() => {
              refreshUser();
              toast.success('Votre compte a été mis à niveau vers le statut Professionnel !');
              navigate('/compte/pro/tableau-de-bord');
            }}
          />

          <BillingHistoryModal
            isOpen={showBillingModal}
            onClose={() => setShowBillingModal(false)}
            userType={currentUser.accountType === 'professional' ? 'professional' : 'individual'}
          />
        </>
      )}
    </div>
  );
};
