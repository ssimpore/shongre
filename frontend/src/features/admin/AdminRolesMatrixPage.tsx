import React, { useState, useMemo } from "react";
import { Select } from "../../design-system";
import {
  Search,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  getRolePermissionMatrix,
  getRoleStats,
  MatrixCategoryGroup,
} from "../../security/matrix.data";
import {
  ROLE_DEFINITIONS,
  ALL_PLATFORM_ROLES,
  platformRoleForStaffRole,
} from "../../security/roles.config";
import { plural } from "../../utilities/formatters";
import { roleLabel } from "../../security/roles.config";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const AdminRolesMatrixPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminRolesMatrix.title"),
    description: t("meta.adminRolesMatrix.description"),
    canonicalPath: "/admin/roles",
    noIndex: true,
  });

  const { currentUser, platformRole } = useAuth();
  const presentedRole = currentUser?.staffRole
    ? platformRoleForStaffRole(currentUser.staffRole)
    : platformRole;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showSensitiveOnly, setShowSensitiveOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    listing: true,
    transaction: true,
    profile: true,
    moderation: true,
    administration: true,
    security: true,
    market: true,
  });

  const matrixGroups = useMemo(() => getRolePermissionMatrix(), []);
  const roleStats = useMemo(() => getRoleStats(), []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredGroups = useMemo(() => {
    return matrixGroups
      .map((group) => {
        if (selectedCategory !== "all" && group.category !== selectedCategory) {
          return null;
        }

        const filteredRows = group.rows.filter((row) => {
          if (showSensitiveOnly && !row.permission.isSensitive) {
            return false;
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            return (
              row.permission.id.toLowerCase().includes(q) ||
              row.permission.name.toLowerCase().includes(q) ||
              row.permission.description.toLowerCase().includes(q)
            );
          }
          return true;
        });

        if (filteredRows.length === 0) return null;

        return {
          ...group,
          rows: filteredRows,
        };
      })
      .filter(Boolean) as MatrixCategoryGroup[];
  }, [matrixGroups, selectedCategory, showSensitiveOnly, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-surface rounded-control border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Gouvernance RBAC
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">
                {t("admin.adminRolesMatrixPage.controleDAccesBaseSur")}
              </span>
            </div>
            <h1 className="text-2xl font-black text-text-main tracking-tight">
              {t(
                "admin.adminRolesMatrixPage.matriceInteractiveDesRolesPermissions",
              )}
            </h1>
            <p className="text-xs text-text-secondary mt-1 max-w-3xl">
              {t(
                "admin.adminRolesMatrixPage.cartographieCompleteEtExhaustiveDes",
              )}
            </p>
          </div>

          {/* Quick Role Switcher Banner */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs flex flex-col gap-1.5 shrink-0">
            <span className="text-stone-500 font-medium">
              {t("admin.adminRolesMatrixPage.votreIdentiteActive")}
            </span>
            <div className="flex items-center gap-2">
              <strong className="text-text-main font-bold">
                {currentUser?.name}
              </strong>
              <span className="bg-primary text-text-inverse text-micro font-bold px-2 py-1 rounded-pill">
                {roleLabel(presentedRole)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Power Spectrum Cards */}
      <div className="bg-bg-surface rounded-control border border-stone-200 p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-icon-md h-icon-md text-stone-700" />
          {t("admin.adminRolesMatrixPage.spectreDElevationDesPrivileges")}{roleStats.length} {t("admin.adminRolesMatrixPage.rolesDefinis")}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {roleStats.map((r) => {
            const isCurrent = r.role === presentedRole;
            return (
              <div
                key={r.role}
                className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                  isCurrent
                    ? "border-primary bg-orange-50/50 shadow-xs ring-1 ring-primary"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-micro font-bold px-2 py-1 rounded-pill border ${r.badgeColor}`}
                    >
                      Niv. {r.hierarchyLevel}
                    </span>
                    {r.isInternalStaff && (
                      <span className="text-micro bg-stone-800 text-stone-200 font-bold px-1 rounded-xs">
                        INTERNE
                      </span>
                    )}
                  </div>
                  <div
                    className="font-bold text-text-main text-xs leading-tight truncate"
                    title={r.title}
                  >
                    {r.title}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-micro text-stone-500">
                  <span>{r.permissionsCount} droits</span>
                  <span className="font-semibold text-stone-700">
                    {r.percentageOfAll}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-bg-surface rounded-control border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-icon-md h-icon-md text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "admin.adminRolesMatrixPage.filtrerUnePermissionExListing",
              )}
              aria-label={t(
                "admin.adminRolesMatrixPage.filtrerUnePermissionExListing",
              )}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-control focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-control-touch"
            />
          </div>

          {/* Category Selector */}
          <Select
            className="w-auto"
            aria-label={t(
              "admin.adminRolesMatrixPage.filtrerLesPermissionsParCategorie",
            )}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">
              {t("admin.adminRolesMatrixPage.toutesLesCategories")}
            </option>
            <option value="listing">
              {t("admin.adminRolesMatrixPage.annoncesCatalogues")}
            </option>
            <option value="transaction">Commandes & Transactions</option>
            <option value="profile">Profils & Boutiques</option>
            <option value="moderation">
              {t("admin.adminRolesMatrixPage.moderationSignalements")}
            </option>
            <option value="administration">
              {t("admin.adminRolesMatrixPage.administrationSysteme")}
            </option>
            <option value="security">
              {t("admin.adminRolesMatrixPage.securiteAudit")}
            </option>
            <option value="market">
              {t("admin.adminRolesMatrixPage.marchesTerritoires")}
            </option>
          </Select>
        </div>

        {/* Sensitive toggle */}
        <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showSensitiveOnly}
            onChange={(e) => setShowSensitiveOnly(e.target.checked)}
            className="w-4 h-4 shrink-0 rounded text-primary focus:ring-primary"
          />
          <AlertTriangle className="w-icon-sm h-icon-sm text-warning" />
          <span>Permissions sensibles uniquement</span>
        </label>
      </div>

      {/* Matrix Table */}
      <div className="bg-bg-surface rounded-control border border-stone-200 shadow-xs overflow-hidden">
        {/* Focusable so the matrix can be scrolled without a pointer — it is
            far wider than any viewport by design. */}
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={t(
            "admin.adminRolesMatrixPage.matriceDesPermissionsParRole",
          )}
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-900 text-text-inverse font-bold border-b border-stone-800">
                <th
                  scope="col"
                  className="p-3 min-w-70 sticky left-0 bg-stone-900 z-raised"
                >
                  {t("admin.adminRolesMatrixPage.permissionPerimetre")}
                </th>
                {ALL_PLATFORM_ROLES.map((r) => {
                  const def = ROLE_DEFINITIONS[r];
                  const isCurrent = r === presentedRole;
                  return (
                    <th
                      scope="col"
                      key={r}
                      className={`p-2.5 text-center min-w-22.5 border-l border-stone-800 ${
                        isCurrent ? "bg-primary-hover text-text-inverse" : ""
                      }`}
                      title={`${def.title} (niveau ${def.hierarchyLevel})`}
                    >
                      <div className="text-xs truncate">{def.shortLabel}</div>
                      <div className="text-micro font-normal opacity-80 truncate">
                        {def.defaultPermissions.length} droits
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={ALL_PLATFORM_ROLES.length + 1}
                    className="p-8 text-center text-stone-500"
                  >
                    {t(
                      "admin.adminRolesMatrixPage.aucunePermissionNeCorrespondA",
                    )}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded =
                    expandedCategories[group.category] !== false;
                  return (
                    <React.Fragment key={group.category}>
                      {/* Category Header Row */}
                      <tr
                        onClick={() => toggleCategory(group.category)}
                        className="bg-stone-100/90 cursor-pointer hover:bg-stone-200/80 transition-colors select-none font-bold text-stone-800"
                      >
                        <td
                          colSpan={ALL_PLATFORM_ROLES.length + 1}
                          className="p-2.5 px-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-icon-md h-icon-md text-stone-500" />
                            ) : (
                              <ChevronRight className="w-icon-md h-icon-md text-stone-500" />
                            )}
                            <span className="uppercase text-xs tracking-wider text-stone-700">
                              {t("admin.adminRolesMatrixPage.categorie")} {group.category} (
                              {plural(group.rows.length, "permission")})
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Permission Rows */}
                      {isExpanded &&
                        group.rows.map((row) => {
                          return (
                            <tr
                              key={row.permission.id}
                              className="hover:bg-stone-50/80 transition-colors"
                            >
                              {/* Permission Info */}
                              <td className="p-3 sticky left-0 bg-bg-surface hover:bg-stone-50 border-r border-stone-200 z-raised">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div
                                      className="font-bold text-text-main text-xs"
                                      title={row.permission.id}
                                    >
                                      {row.permission.name}
                                    </div>
                                    <div className="text-micro text-stone-500 mt-0.5">
                                      {row.permission.description}
                                    </div>
                                  </div>
                                  {row.permission.isSensitive && (
                                    <span
                                      className="shrink-0 text-micro bg-danger-surface text-danger font-bold px-2 py-1 rounded-sm border border-danger-border"
                                      title={t(
                                        "admin.adminRolesMatrixPage.permissionSensibleOuIrreversible",
                                      )}
                                    >
                                      SENSIBLE
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Grants per role */}
                              {ALL_PLATFORM_ROLES.map((r) => {
                                const isGranted = row.roleGrants[r];
                                const isCurrent = r === presentedRole;
                                return (
                                  <td
                                    key={r}
                                    className={`p-2.5 text-center border-l border-stone-100 ${
                                      isCurrent ? "bg-orange-50/40" : ""
                                    }`}
                                  >
                                    {isGranted ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-pill bg-success-surface text-success">
                                        <Check className="w-icon-sm h-icon-sm stroke-3" />
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-pill text-stone-300">
                                        <X className="w-icon-xs h-icon-xs stroke-2" />
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
