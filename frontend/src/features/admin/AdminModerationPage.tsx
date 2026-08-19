import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  Filter,
  Search,
  Sparkles,
  Bot,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { storageService } from '../../services/storage.service';
import { listingRepository } from '../../repositories/listing.repository';
import { userRepository } from '../../repositories/user.repository';
import { services } from '../../api/client/service-registry';
import { ListingSafetyAnalysis } from '../../api/contracts/ai.contract';
import { Listing, UserProfile } from '../../types';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { Modal } from '../../design-system/primitives/Modal';
import { ConfirmModal } from '../../design-system/primitives/ConfirmModal';
import { PromptModal } from '../../design-system/primitives/PromptModal';
import { Image } from '../../design-system/primitives/Image';
import { useTranslation } from '../../i18n/I18nProvider';

export const AdminModerationPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, can } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'reports' | 'listings' | 'users'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Modals state
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  
  // AI Safety Analysis modal state
  const [selectedListingForAI, setSelectedListingForAI] = useState<Listing | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ListingSafetyAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadData = () => {
    setReports(storageService.getUserReports());
    setListings(storageService.getListings());
    const usersMap = storageService.getUsers();
    setUsers(Object.values(usersMap));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveReport = (reportId: string) => {
    storageService.resolveUserReport(reportId, 'Traité par le modérateur');
    loadData();
    toast.success('Signalement classé et marqué comme traité.');
  };

  const handleToggleListingStatus = async (listingId: string, currentStatus: string) => {
    try {
      const nextAction = currentStatus === 'active' ? 'hide' : 'approve';
      await listingRepository.moderateListing(listingId, nextAction, 'Vérification modérateur Shongre');
      loadData();
      toast.success(`Statut de l'annonce mis à jour (${nextAction === 'hide' ? 'masquée' : 'rétablie'}).`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la modération de l\'annonce');
    }
  };

  const handleConfirmDeleteListing = async () => {
    if (!deleteListingId) return;
    try {
      await listingRepository.moderateListing(deleteListingId, 'delete', 'Violation des conditions de modération');
      loadData();
      toast.success('Annonce supprimée définitivement du catalogue.');
      setDeleteListingId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression de l\'annonce');
    }
  };

  const handleConfirmSuspendUser = async (reason: string) => {
    if (!suspendUserId) return;
    try {
      await userRepository.suspendUser(suspendUserId, reason);
      loadData();
      toast.success('Compte utilisateur suspendu avec motif consigné au registre.');
      setSuspendUserId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suspension de l\'utilisateur');
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await userRepository.reactivateUser(userId);
      loadData();
      toast.success('Compte utilisateur réactivé avec succès.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réactivation de l\'utilisateur');
    }
  };

  const handleRunAISafetyAudit = async (listing: Listing) => {
    setSelectedListingForAI(listing);
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await services.ai.analyzeListingSafety({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        sellerName: listing.sellerName,
      });
      setAiAnalysis(result);
    } catch (err: any) {
      toast.error('Échec de l\'analyse IA');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border-base p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('admin.adminModerationPage.moderationSecurite')}</span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-medium">{t('admin.adminModerationPage.controleDesContenusEtProfils')}</span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">{t('admin.adminModerationPage.fileDeModerationSignalements')}</h1>
        <p className="text-xs text-stone-600 mt-1">{t('admin.adminModerationPage.surveillanceEnTempsReelDes')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-base gap-4 text-xs font-bold overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'border-primary text-primary'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Signalements Reçus ({reports.filter((r) => r.status !== 'resolved').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'listings'
              ? 'border-primary text-primary'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Contrôle & Audit IA Annonces ({listings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Comptes Suspendus ({users.filter((u) => u.isSuspended).length})</span>
        </button>
      </div>

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
          {reports.filter((r) => r.status !== 'resolved').length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <div className="text-sm font-bold text-stone-800">Aucun signalement en attente</div>
              <div className="text-xs text-stone-500 mt-1">{t('admin.adminModerationPage.laFileDeSignalementsCommunautaires')}</div>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {reports
                .filter((r) => r.status !== 'resolved')
                .map((rep) => (
                  <div key={rep.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="urgent">{rep.reason || 'Signalement'}</Badge>
                        <span className="text-xs font-semibold text-stone-900">
                          Cible : {rep.targetUserName || rep.targetUserId}
                        </span>
                        <span className="text-micro text-stone-500">
                          {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {rep.comment && (
                        <p className="text-xs text-stone-600 bg-bg-base p-2.5 rounded-xl border border-border-base">
                          "{rep.comment}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveReport(rep.id)}
                        className="text-xs text-stone-700"
                      >{t('admin.adminModerationPage.classerSansSuite')}</Button>
                      <Button
                        size="sm"
                        onClick={() => setSuspendUserId(rep.targetUserId)}
                        className="text-xs bg-danger hover:bg-danger text-white"
                      >{t('admin.adminModerationPage.suspendreLeProfil')}</Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Listings with AI Audit */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-border-subtle bg-bg-base text-xs font-semibold text-stone-600 flex justify-between items-center">
            <span>Catalogue d'annonces Shongre ({listings.length} au total)</span>
            <span className="text-micro text-stone-500">{t('admin.adminModerationPage.cliquezSurAuditIaPour')}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-700 font-bold border-b border-border-base">
                <tr>
                  <th className="p-3.5">{t('admin.adminModerationPage.annonce')}</th>
                  <th className="p-3.5">{t('admin.adminModerationPage.vendeur')}</th>
                  <th className="p-3.5">Prix</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">{t('admin.adminModerationPage.actionsDeModeration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {listings.slice(0, 15).map((list) => (
                  <tr key={list.id} className="hover:bg-bg-base transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Image
                          src={list.coverImageUrl || list.photos?.[0]?.url}
                          alt={list.title}
                          sizes="40px"
                          className="w-10 h-10 rounded-xl object-cover border border-border-base shrink-0"
                        />
                        <div>
                          <div className="font-bold text-stone-900 line-clamp-1">{list.title}</div>
                          <div className="text-xs text-stone-500">{list.categoryLabel} • {list.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-stone-800">{list.sellerName}</td>
                    <td className="p-3.5 font-bold text-stone-900">{list.price} €</td>
                    <td className="p-3.5">
                      <Badge variant={list.status === 'active' ? 'success' : 'warning'}>
                        {list.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunAISafetyAudit(list)}
                          className="text-xs flex items-center gap-1 text-primary border-primary/30 hover:bg-primary-light"
                        >
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span>Audit IA</span>
                        </Button>
                        <Button
                          aria-label={t('admin.adminModerationPage.supprimerCetteAnnonce')}
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleListingStatus(list.id, list.status)}
                          className="text-xs"
                        >
                          {list.status === 'active' ? 'Masquer' : 'Rétablir'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteListingId(list.id)}
                          className="text-danger hover:bg-danger-surface text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Suspended Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
          <div className="divide-y divide-border-subtle">
            {users
              .filter((u) => u.isSuspended)
              .map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                      alt={u.name}
                      sizes="40px"
                      className="w-10 h-10 rounded-full object-cover border border-danger-border"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
                        <span>{u.name}</span>
                        <Badge variant="urgent">SUSPENDU</Badge>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Motif légal : {u.suspendedReason || 'Mesure conservatoire de sécurité'}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivateUser(u.id)}
                    className="text-xs text-success border-success-border hover:bg-success-surface"
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1" />{t('admin.adminModerationPage.leverLaSuspension')}</Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Safety Analysis Result Modal */}
      {selectedListingForAI && (
        <Modal
          isOpen={Boolean(selectedListingForAI)}
          onClose={() => setSelectedListingForAI(null)}
          title={t('admin.adminModerationPage.auditDeSecuriteIaGemini')}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-bg-base rounded-xl border border-border-base">
              <div className="font-bold text-xs text-stone-900">{selectedListingForAI.title}</div>
              <div className="text-xs text-stone-500 mt-0.5">{selectedListingForAI.price} € • Vendeur : {selectedListingForAI.sellerName}</div>
            </div>

            {isAiLoading ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-medium text-stone-600">{t('admin.adminModerationPage.analyseDeConformiteEtDetection')}</p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  aiAnalysis.riskScore > 50
                    ? 'bg-danger-surface border-danger-border text-danger'
                    : aiAnalysis.riskScore > 20
                    ? 'bg-warning-surface border-warning-border text-warning'
                    : 'bg-success-surface border-success-border text-success'
                }`}>
                  <div>
                    <div className="text-xs uppercase font-bold tracking-wider">{t('admin.adminModerationPage.scoreDeRisqueDetecte')}</div>
                    <div className="text-2xl font-black">{aiAnalysis.riskScore}/100</div>
                  </div>
                  <Badge variant={aiAnalysis.riskScore > 50 ? 'urgent' : aiAnalysis.riskScore > 20 ? 'warning' : 'verified'}>
                    {aiAnalysis.verdict.toUpperCase()}
                  </Badge>
                </div>

                <div className="text-xs text-stone-700 space-y-1">
                  <span className="font-bold block text-stone-900">{t('admin.adminModerationPage.syntheseDeLAgentIa')}</span>
                  <p className="leading-relaxed bg-stone-50 p-3 rounded-xl border border-border-subtle">{aiAnalysis.summary}</p>
                </div>

                {aiAnalysis.flaggedKeywords && aiAnalysis.flaggedKeywords.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-stone-900 block mb-1.5">{t('admin.adminModerationPage.elementsSignales')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.flaggedKeywords.map((kw, i) => (
                        <span key={i} className="text-micro font-semibold bg-danger-surface text-danger px-2 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <Button variant="outline" size="sm" onClick={() => setSelectedListingForAI(null)}>
                    Fermer
                  </Button>
                  {aiAnalysis.riskScore > 30 && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-danger hover:bg-danger text-white"
                      onClick={() => {
                        handleToggleListingStatus(selectedListingForAI.id, selectedListingForAI.status);
                        setSelectedListingForAI(null);
                      }}
                    >{t('admin.adminModerationPage.masquerLAnnonce')}</Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Delete Listing */}
      <ConfirmModal
        isOpen={Boolean(deleteListingId)}
        onClose={() => setDeleteListingId(null)}
        onConfirm={handleConfirmDeleteListing}
        title={t('admin.adminModerationPage.supprimerDefinitivementLAnnonce')}
        message="Cette action retirera irréversiblement l'annonce du catalogue public et notifiera le vendeur."
        confirmText="Supprimer l'annonce"
        variant="danger"
      />

      {/* Prompt Modal for User Suspension */}
      <PromptModal
        isOpen={Boolean(suspendUserId)}
        onClose={() => setSuspendUserId(null)}
        onSubmit={handleConfirmSuspendUser}
        title={t('admin.adminModerationPage.suspendreLeCompteUtilisateur')}
        label={t('admin.adminModerationPage.motifLegalEtContractuelDe')}
        placeholder={t('admin.adminModerationPage.exSignalementsMultiplesPourNon')}
        confirmText="Confirmer la suspension"
        required
      />
    </div>
  );
};
