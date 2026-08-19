import { isProSeller } from '../../domains/user/user.domain';
import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Building2,
  User,
  Sliders,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { storageService } from '../../services/storage.service';
import { userRepository } from '../../repositories/user.repository';
import { ROLE_DEFINITIONS, ALL_PLATFORM_ROLES } from '../../security/roles.config';
import { UserProfile, PlatformRole, AccountType } from '../../types';
import { Button } from '../../design-system/primitives/Button';
import { ConfirmModal } from '../../design-system/primitives/ConfirmModal';
import { PromptModal } from '../../design-system/primitives/PromptModal';
import { Image } from '../../design-system/primitives/Image';
import { useTranslation } from '../../i18n/I18nProvider';

export const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, can, switchDemoUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modals state
  const [kbisModalUser, setKbisModalUser] = useState<UserProfile | null>(null);
  const [suspendModalUser, setSuspendModalUser] = useState<UserProfile | null>(null);
  const [reactivateModalUser, setReactivateModalUser] = useState<UserProfile | null>(null);

  const loadUsers = () => {
    const usersMap = storageService.getUsers();
    setUsers(Object.values(usersMap));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleConfirmVerifyPro = async (notes: string) => {
    if (!kbisModalUser) return;
    try {
      await userRepository.verifyUser(kbisModalUser.id, { approve: true, notes: notes || 'Kbis vérifié conforme' });
      loadUsers();
      toast.success(`Compte Pro de ${kbisModalUser.name} vérifié et badge validé.`);
      setKbisModalUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation du KBIS');
    }
  };

  const handleConfirmSuspend = async (reason: string) => {
    if (!suspendModalUser) return;
    try {
      await userRepository.suspendUser(suspendModalUser.id, reason);
      loadUsers();
      toast.success(`Le compte de ${suspendModalUser.name} a été suspendu.`);
      setSuspendModalUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suspension');
    }
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateModalUser) return;
    try {
      await userRepository.reactivateUser(reactivateModalUser.id);
      loadUsers();
      toast.success(`Le compte de ${reactivateModalUser.name} a été réactivé avec succès.`);
      setReactivateModalUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réactivation');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRole !== 'all' && u.primaryRole !== selectedRole && u.role !== selectedRole) {
      return false;
    }
    if (selectedType !== 'all' && u.accountType !== selectedType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.companyName?.toLowerCase().includes(q) ||
        u.siret?.includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border-base p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Gouvernance des Identités
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-medium">{t('admin.adminUsersPage.gestionDesComptesVerificationsKbis')}</span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">
          Annuaire des Utilisateurs & Vérifications
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Consultez et administrez l'ensemble des comptes (particuliers, professionnels et collaborateurs internes).
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-border-base p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin.adminUsersPage.rechercherUnNomEmailEntreprise')}
              aria-label={t('admin.adminUsersPage.rechercherUnUtilisateur')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-base rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-bg-base"
            />
          </div>

          <select
            aria-label={t('admin.adminUsersPage.filtrerParTypeDeCompte')}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="py-2 px-3 text-xs border border-border-base rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-bg-base"
          >
            <option value="all">{t('admin.adminUsersPage.tousLesTypesDeCompte')}</option>
            <option value="individual">Particulier</option>
            <option value="professional">Professionnel (Pro)</option>
            <option value="internal_staff">Personnel Interne (Staff)</option>
          </select>

          <select
            aria-label={t('admin.adminUsersPage.filtrerParRolePlateforme')}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="py-2 px-3 text-xs border border-border-base rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-bg-base"
          >
            <option value="all">Tous les rôles ({ALL_PLATFORM_ROLES.length})</option>
            {ALL_PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_DEFINITIONS[r]?.title || r}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-stone-500 font-semibold shrink-0">
          {filteredUsers.length} utilisateur(s) trouvé(s)
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 font-bold border-b border-border-base">
              <tr>
                <th className="p-3.5">Utilisateur</th>
                <th className="p-3.5">{t('admin.adminUsersPage.typeRole')}</th>
                <th className="p-3.5">{t('admin.adminUsersPage.statutVerification')}</th>
                <th className="p-3.5">{t('admin.adminUsersPage.marcheVille')}</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredUsers.map((u) => {
                const roleDef = ROLE_DEFINITIONS[u.primaryRole || u.role] || ROLE_DEFINITIONS.buyer;
                const isPro = isProSeller(u);
                const isPendingPro = isPro && u.professionalVerification?.status === 'pending';

                return (
                  <tr key={u.id} className="hover:bg-bg-base transition-colors">
                    {/* Identity */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Image
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                          alt={u.name}
                          sizes="36px"
                          className="w-9 h-9 rounded-full object-cover border border-border-base"
                        />
                        <div>
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-info" />
                            )}
                          </div>
                          <div className="text-xs text-stone-500">
                            {u.companyName ? `${u.companyName} • ` : ''}
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Role */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-micro font-bold px-2 py-1 rounded-full border ${roleDef.badgeColor}`}>
                          {roleDef.title}
                        </span>
                        <span className="text-micro text-stone-500 font-mono">
                          {u.accountType || 'individual'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {u.isSuspended ? (
                          <span className="text-micro bg-danger-surface text-danger font-bold px-2 py-1 rounded-sm">
                            SUSPENDU
                          </span>
                        ) : isPendingPro ? (
                          <span className="text-micro bg-warning-surface text-warning font-bold px-2 py-1 rounded-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> KBIS En attente
                          </span>
                        ) : (
                          <span className="text-micro bg-success-surface text-success font-bold px-2 py-1 rounded-sm">
                            ACTIF
                          </span>
                        )}
                        {u.siret && (
                          <span className="text-micro text-stone-500 font-mono">
                            SIRET: {u.siret}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-3.5 text-stone-600">
                      <div>{u.city || 'Non renseigné'}</div>
                      <div className="text-micro text-stone-500 font-mono">
                        {u.marketScope?.countries.join(', ') || 'FR'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Verify Pro KBIS Button */}
                        {isPendingPro && can('user.verify') && (
                          <Button
                            size="sm"
                            onClick={() => setKbisModalUser(u)}
                            className="text-xs bg-success hover:bg-success text-white flex items-center gap-1"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Valider KBIS</span>
                          </Button>
                        )}

                        {/* Suspend / Reactivate */}
                        {can('user.suspend') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (u.isSuspended) {
                                setReactivateModalUser(u);
                              } else {
                                setSuspendModalUser(u);
                              }
                            }}
                            className={`text-xs ${
                              u.isSuspended ? 'text-success border-success-border' : 'text-danger border-danger-border'
                            }`}
                          >
                            {u.isSuspended ? 'Réactiver' : 'Suspendre'}
                          </Button>
                        )}

                        {/* Impersonate / Switch to role for test */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            switchDemoUser(u.id);
                            toast.info(`Basculé sur l'identité : ${u.name}`);
                          }}
                          className="text-xs text-stone-700"
                          title={t('admin.adminUsersPage.seConnecterEnTantQue')}
                        >
                          Tester
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KBIS Validation Modal */}
      <PromptModal
        isOpen={Boolean(kbisModalUser)}
        onClose={() => setKbisModalUser(null)}
        onSubmit={handleConfirmVerifyPro}
        title="Validation KBIS Entreprise"
        label={t('admin.adminUsersPage.noteInterneDeVerificationDes')}
        initialValue="Justificatif KBIS / SIRET vérifié conforme auprès des registres officiels."
        confirmText="Valider le badge Pro"
        required
      />

      {/* Suspend User Modal */}
      <PromptModal
        isOpen={Boolean(suspendModalUser)}
        onClose={() => setSuspendModalUser(null)}
        onSubmit={handleConfirmSuspend}
        title={t('admin.adminUsersPage.suspendreUnCompteUtilisateur')}
        label={t('admin.adminUsersPage.motifLegalDeLaMesure')}
        placeholder={t('admin.adminUsersPage.exInfractionAuxReglesDe')}
        confirmText="Confirmer la suspension"
        required
      />

      {/* Reactivate User Modal */}
      <ConfirmModal
        isOpen={Boolean(reactivateModalUser)}
        onClose={() => setReactivateModalUser(null)}
        onConfirm={handleConfirmReactivate}
        title={t('admin.adminUsersPage.reactiverLeCompte')}
        message={`Confirmez-vous la levée de la suspension pour l'utilisateur ${reactivateModalUser?.name} ?`}
        confirmText="Réactiver le compte"
        variant="success"
      />
    </div>
  );
};
