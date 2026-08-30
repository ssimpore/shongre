import { isProSeller } from "../../domains/user/user.domain";
import { FormField, Modal, Select, Textarea } from "../../design-system";
import React, { useState, useEffect } from "react";
import {
  Search,
  AlertTriangle,
  FileCheck,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  ROLE_DEFINITIONS,
  ALL_PLATFORM_ROLES,
  STAFF_ROLE_PRESENTATION,
} from "../../security/roles.config";
import { UserProfile, type StaffRole, type StaffStatus } from "../../types";
import { Button } from "../../design-system/primitives/Button";
import { PromptModal } from "../../design-system/primitives/PromptModal";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { usePageMeta } from "../../hooks/usePageMeta";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  STAFF_ACCESS_REASON_MAX_LENGTH,
  STAFF_ACCESS_REASON_MIN_LENGTH,
  STAFF_ROLES,
  staffRoleFromLegacyRole,
} from "@shongre/contracts/access-control";
import {
  StaffBadge,
  VerificationBadge,
} from "../../design-system/components/IdentityBadges";
import { CapabilityOverridesModal } from "./CapabilityOverridesModal";
import { adminPrimaryIdentity } from "./admin-user-identity";
import { AdminUserPrimaryBadge } from "./AdminUserPrimaryBadge";

export const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminUsers.title"),
    description: t("meta.adminUsers.description"),
    canonicalPath: "/admin/utilisateurs",
    noIndex: true,
  });

  const { can, currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStaffStatus, setSelectedStaffStatus] = useState<string>("all");

  // Modals state
  const [kbisModalUser, setKbisModalUser] = useState<UserProfile | null>(null);
  const [suspendModalUser, setSuspendModalUser] = useState<UserProfile | null>(
    null,
  );
  const [reactivateModalUser, setReactivateModalUser] =
    useState<UserProfile | null>(null);
  const [staffModalUser, setStaffModalUser] = useState<UserProfile | null>(
    null,
  );
  const [capabilityModalUser, setCapabilityModalUser] =
    useState<UserProfile | null>(null);
  const [staffStatus, setStaffStatus] =
    useState<Exclude<StaffStatus, "none">>("active");
  const [staffRole, setStaffRole] = useState<StaffRole>("support_agent");
  const [staffReason, setStaffReason] = useState("");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const loadUsers = async () => {
    setUsers(await services.admin.getAllUsers());
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleConfirmVerifyPro = async (notes: string) => {
    if (!kbisModalUser) return;
    try {
      await services.admin.reviewProfessionalVerification(
        kbisModalUser.id,
        true,
        notes || "Kbis vérifié conforme",
      );
      await loadUsers();
      toast.success(
        `Compte Pro de ${kbisModalUser.name} vérifié et badge validé.`,
      );
      setKbisModalUser(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la validation du KBIS",
      );
    }
  };

  const handleConfirmSuspend = async (reason: string) => {
    if (!suspendModalUser) return;
    try {
      await services.admin.updateUserStatus(
        suspendModalUser.id,
        "suspended",
        reason,
      );
      await loadUsers();
      toast.success(`Le compte de ${suspendModalUser.name} a été suspendu.`);
      setSuspendModalUser(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la suspension",
      );
    }
  };

  const handleConfirmReactivate = async (reason: string) => {
    if (!reactivateModalUser) return;
    try {
      await services.admin.updateUserStatus(
        reactivateModalUser.id,
        "active",
        reason,
      );
      await loadUsers();
      toast.success(
        `Le compte de ${reactivateModalUser.name} a été réactivé avec succès.`,
      );
      setReactivateModalUser(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la réactivation",
      );
    }
  };

  const openStaffModal = (user: UserProfile) => {
    setStaffModalUser(user);
    setStaffStatus(user.staffStatus === "suspended" ? "suspended" : "active");
    setStaffRole(user.staffRole || "support_agent");
    setStaffReason("");
    setStaffError(null);
  };

  const handleStaffSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffModalUser) return;
    if (staffReason.trim().length < STAFF_ACCESS_REASON_MIN_LENGTH) {
      setStaffError(t("admin.staff.reasonMinimum"));
      return;
    }
    setIsSavingStaff(true);
    setStaffError(null);
    try {
      await services.admin.updateStaffStatus(
        staffModalUser.id,
        staffStatus,
        staffRole,
        staffReason.trim(),
      );
      await loadUsers();
      toast.success(t("admin.staff.updateSuccess"));
      setStaffModalUser(null);
    } catch (error: unknown) {
      setStaffError(
        error instanceof Error ? error.message : t("admin.staff.updateError"),
      );
    } finally {
      setIsSavingStaff(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (
      selectedRole !== "all" &&
      u.primaryRole !== selectedRole &&
      u.role !== selectedRole &&
      u.staffRole !== staffRoleFromLegacyRole(selectedRole)
    ) {
      return false;
    }
    if (selectedType !== "all" && u.accountType !== selectedType) {
      return false;
    }
    if (
      selectedStaffStatus !== "all" &&
      (u.staffStatus ?? "none") !== selectedStaffStatus
    ) {
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
      <div className="bg-bg-surface rounded-2xl border border-border-base p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("admin.adminUsersPage.gouvernanceDesIdentites")}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-medium">
            {t("admin.adminUsersPage.gestionDesComptesVerificationsKbis")}
          </span>
        </div>
        <h1 className="text-2xl font-black text-text-main tracking-tight">
          {t("admin.adminUsersPage.annuaireDesUtilisateursVerifications")}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t("admin.adminUsersPage.consultezEtAdministrezLEnsemble")}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-bg-surface rounded-2xl border border-border-base p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-icon-md h-icon-md text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "admin.adminUsersPage.rechercherUnNomEmailEntreprise",
              )}
              aria-label={t("admin.adminUsersPage.rechercherUnUtilisateur")}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-base rounded-control focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-bg-base h-control-touch"
            />
          </div>

          <Select
            className="w-auto"
            aria-label={t("admin.adminUsersPage.filtrerParTypeDeCompte")}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">
              {t("admin.adminUsersPage.tousLesTypesDeCompte")}
            </option>
            <option value="individual">Particulier</option>
            <option value="professional">Professionnel (Pro)</option>
          </Select>

          <Select
            className="w-auto"
            aria-label={t("admin.staff.filterLabel")}
            value={selectedStaffStatus}
            onChange={(e) => setSelectedStaffStatus(e.target.value)}
          >
            <option value="all">{t("admin.staff.filterAll")}</option>
            <option value="active">{t("admin.staff.status.active")}</option>
            <option value="suspended">
              {t("admin.staff.status.suspended")}
            </option>
            <option value="revoked">{t("admin.staff.status.revoked")}</option>
            <option value="none">{t("admin.staff.status.none")}</option>
          </Select>

          <Select
            className="w-auto"
            aria-label={t("admin.adminUsersPage.filtrerParRolePlateforme")}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">
              {t("admin.adminUsersPage.tousLesRoles")}{ALL_PLATFORM_ROLES.length})
            </option>
            {ALL_PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_DEFINITIONS[r]?.title || r}
              </option>
            ))}
          </Select>
        </div>

        {/* Announced, because it is the only feedback a filter gives. Typing in
            the search box or changing a select silently rewrote this number and
            the table beneath it; a screen-reader user got no indication that
            anything had happened. `aria-atomic` makes the whole sentence read,
            not just the digit that changed. */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-stone-500 font-semibold shrink-0"
        >
          {t("admin.adminUsersPage.utilisateursTrouves", {
            count: filteredUsers.length,
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-bg-surface rounded-2xl border border-border-base shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 font-bold border-b border-border-base">
              <tr>
                <th scope="col" className="p-3.5">
                  Utilisateur
                </th>
                <th scope="col" className="p-3.5">
                  {t("admin.adminUsersPage.typeRole")}
                </th>
                <th scope="col" className="p-3.5">
                  {t("admin.adminUsersPage.statutVerification")}
                </th>
                <th scope="col" className="p-3.5">
                  {t("admin.adminUsersPage.marcheVille")}
                </th>
                <th scope="col" className="p-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredUsers.map((u) => {
                const primaryIdentity = adminPrimaryIdentity(u);
                const isPro = isProSeller(u);
                const isPendingPro =
                  isPro && u.professionalVerification?.status === "pending";
                const isSuspended = u.isSuspended || u.status === "suspended";
                const isActiveStaff = primaryIdentity === "staff";

                return (
                  <tr key={u.id} className="hover:bg-bg-base transition-colors">
                    {/* Identity */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Image
                          src={
                            u.avatarUrl ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
                          }
                          alt={u.name}
                          sizes="36px"
                          className="w-9 h-9 rounded-pill object-cover border border-border-base"
                        />
                        <div>
                          <div className="font-bold text-text-main flex items-center gap-1.5">
                            <span>{u.name}</span>
                          </div>
                          <VerificationBadge
                            verified={u.isVerified}
                            accountType={u.accountType || "individual"}
                            className="mt-1"
                          />
                          <div className="text-xs text-stone-500">
                            {u.companyName ? `${u.companyName} • ` : ""}
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Role */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <AdminUserPrimaryBadge user={u} />
                        {/* This rendered the raw stored enum — `individual`,
                            `professional`, `internal` — in monospace directly
                            under the translated role badge above it. Two labels
                            for the same fact, one of them a backend key. The
                            account type is worth showing (a professional account
                            with an individual role is a real state), so it stays
                            — as words. */}
                        <span className="text-micro text-stone-500">
                          {t(
                            `admin.accountType.${u.accountType || "individual"}` as MessageKey,
                          )}
                        </span>
                        {!isActiveStaff && (
                          <StaffBadge status={u.staffStatus} showLifecycle />
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {isSuspended ? (
                          <span className="text-micro bg-danger-surface text-danger font-bold px-2 py-1 rounded-sm">
                            SUSPENDU
                          </span>
                        ) : isPendingPro ? (
                          <span className="text-micro bg-warning-surface text-warning font-bold px-2 py-1 rounded-sm flex items-center gap-1">
                            <AlertTriangle className="w-icon-xs h-icon-xs" />{" "}
                            KBIS En attente
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
                        {u.staffStatus && u.staffStatus !== "none" && (
                          <span className="text-micro text-text-secondary font-semibold">
                            {t(
                              `admin.staff.status.${u.staffStatus}` as MessageKey,
                            )}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-3.5 text-text-secondary">
                      <div>{u.city || "Non renseigné"}</div>
                      <div className="text-micro text-stone-500 font-mono">
                        {u.marketScope?.countries.join(", ") ||
                          activeMarket.code}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Verify Pro KBIS Button */}
                        {isPendingPro && can("user.verify") && (
                          <Button
                            size="sm"
                            onClick={() => setKbisModalUser(u)}
                            className="text-xs bg-success hover:bg-success text-text-inverse flex items-center gap-1"
                          >
                            <FileCheck className="w-icon-xs h-icon-xs" />
                            <span>Valider KBIS</span>
                          </Button>
                        )}

                        {/* Suspend / Reactivate */}
                        {((isSuspended && can("user.reactivate")) ||
                          (!isSuspended &&
                            u.staffStatus !== "active" &&
                            can("user.suspend"))) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (isSuspended) {
                                setReactivateModalUser(u);
                              } else {
                                setSuspendModalUser(u);
                              }
                            }}
                            className={`text-xs ${
                              isSuspended
                                ? "text-success border-success-border"
                                : "text-danger border-danger-border"
                            }`}
                          >
                            {isSuspended ? "Réactiver" : "Suspendre"}
                          </Button>
                        )}

                        {can("admin.staff.manage") &&
                          currentUser?.id !== u.id &&
                          (u.staffRole !== "owner" ||
                            currentUser?.staffRole === "owner") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStaffModal(u)}
                              className="text-xs text-info border-info-border"
                            >
                              <ShieldCheck className="w-icon-xs h-icon-xs" />
                              {u.staffStatus && u.staffStatus !== "none"
                                ? t("admin.staff.manageAction")
                                : t("admin.staff.grantAction")}
                            </Button>
                          )}

                        {can("admin.permissions.manage") &&
                          currentUser?.id !== u.id &&
                          (u.staffRole !== "owner" ||
                            currentUser?.staffRole === "owner") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCapabilityModalUser(u)}
                              className="text-xs text-violet-700 border-violet-200"
                            >
                              <KeyRound className="w-icon-xs h-icon-xs" />
                              {t("admin.capabilities.manageAction")}
                            </Button>
                          )}
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
        label={t("admin.adminUsersPage.noteInterneDeVerificationDes")}
        initialValue="Justificatif KBIS / SIRET vérifié conforme auprès des registres officiels."
        confirmText="Valider le badge Pro"
        required
      />

      <Modal
        isOpen={Boolean(staffModalUser)}
        onClose={() => setStaffModalUser(null)}
        title={t("admin.staff.modalTitle")}
        maxWidth="md"
      >
        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <p className="text-xs text-text-secondary">
            {t("admin.staff.modalDescription", {
              name: staffModalUser?.name || "",
            })}
          </p>
          <FormField label={t("admin.staff.roleLabel")} required>
            <Select
              labelledByAncestor
              value={staffRole}
              onChange={(event) =>
                setStaffRole(event.target.value as StaffRole)
              }
            >
              {STAFF_ROLES.filter(
                (role) =>
                  role !== "owner" || currentUser?.staffRole === "owner",
              ).map((role) => (
                <option key={role} value={role}>
                  {STAFF_ROLE_PRESENTATION[role].title}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("admin.staff.statusLabel")} required>
            <Select
              labelledByAncestor
              value={staffStatus}
              onChange={(event) =>
                setStaffStatus(
                  event.target.value as Exclude<StaffStatus, "none">,
                )
              }
            >
              <option value="active">{t("admin.staff.status.active")}</option>
              {staffModalUser?.staffStatus &&
                staffModalUser.staffStatus !== "none" && (
                  <>
                    <option value="suspended">
                      {t("admin.staff.status.suspended")}
                    </option>
                    <option value="revoked">
                      {t("admin.staff.status.revoked")}
                    </option>
                  </>
                )}
            </Select>
          </FormField>
          <FormField
            label={t("admin.staff.reasonLabel")}
            required
            hint={t("admin.staff.reasonHint")}
            error={staffError || undefined}
          >
            <Textarea
              rows={4}
              value={staffReason}
              onChange={(event) => {
                setStaffReason(event.target.value);
                if (staffError) setStaffError(null);
              }}
              maxLength={STAFF_ACCESS_REASON_MAX_LENGTH}
            />
          </FormField>
          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStaffModalUser(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isSavingStaff}>
              {isSavingStaff
                ? t("common.loading")
                : t("admin.staff.confirmAction")}
            </Button>
          </div>
        </form>
      </Modal>

      {capabilityModalUser && (
        <CapabilityOverridesModal
          user={capabilityModalUser}
          actorIsOwner={currentUser?.staffRole === "owner"}
          onClose={() => setCapabilityModalUser(null)}
          onUpdated={loadUsers}
        />
      )}

      {/* Suspend User Modal */}
      <PromptModal
        isOpen={Boolean(suspendModalUser)}
        onClose={() => setSuspendModalUser(null)}
        onSubmit={handleConfirmSuspend}
        title={t("admin.adminUsersPage.suspendreUnCompteUtilisateur")}
        label={t("admin.adminUsersPage.motifLegalDeLaMesure")}
        placeholder={t("admin.adminUsersPage.exInfractionAuxReglesDe")}
        confirmText="Confirmer la suspension"
        required
      />

      {/* Reactivate User Modal */}
      <PromptModal
        isOpen={Boolean(reactivateModalUser)}
        onClose={() => setReactivateModalUser(null)}
        onSubmit={handleConfirmReactivate}
        title={t("admin.adminUsersPage.reactiverLeCompte")}
        label={`Motif de réactivation pour ${reactivateModalUser?.name || "ce compte"}`}
        placeholder={t("admin.adminUsersPage.exExamenTermineEtMesuresCorrectivesConfirmees")}
        confirmText="Réactiver le compte"
        required
      />
    </div>
  );
};
