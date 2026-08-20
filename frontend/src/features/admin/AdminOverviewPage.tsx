import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  
  ArrowRight,
  Clock,
  TrendingUp,
  FileSpreadsheet
  
  
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { storageService } from '../../services/storage.service';
import { auditService } from '../../security/audit.service';
import { auditActionLabel } from '../../types';
import { formatLogTimestamp } from '../../utilities/formatters';
import { ROLE_DEFINITIONS, roleLabel } from '../../security/roles.config';
import { Button } from '../../design-system/primitives/Button';
import { Image } from '../../design-system/primitives/Image';
import { useTranslation } from '../../i18n/I18nProvider';

export const AdminOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, platformRole, can } = useAuth();
  const [usersCount, setUsersCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [listingsCount, setListingsCount] = useState(0);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  useEffect(() => {
    const usersMap = storageService.getUsers();
    const allUsers = Object.values(usersMap);
    setUsersCount(allUsers.length);

    const pending = allUsers.filter(
      (u) =>
        u.accountType === 'professional' &&
        u.professionalVerification?.status === 'pending'
    );
    setPendingVerifications(pending);

    const reports = storageService.getUserReports();
    setReportsCount(reports.length);

    const listings = storageService.getListings();
    setListingsCount(listings.length);

    const logs = auditService.getLogs(6);
    setRecentAudits(logs);
  }, []);

  const roleMeta = ROLE_DEFINITIONS[platformRole] || ROLE_DEFINITIONS.guest;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Console d'Administration
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Shongre Security Core</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Bonjour, {currentUser?.name || 'Collaborateur'}
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">{t('admin.adminOverviewPage.vousOperezAvecLeRole')}<strong className="text-stone-900">{roleMeta.title}</strong>{' '}
            sur le périmètre territorial{' '}
            <strong className="text-stone-900">{currentUser?.marketScope?.countries.join(', ') || 'FR'}</strong>.
          </p>
        </div>

        {/* Wraps rather than shrinks: both labels are long enough to push the
            document past a 320px viewport when forced onto one line. */}
        <div className="flex flex-wrap items-center gap-2">
          <Button to="/admin/roles" variant="outline" size="sm">{t('admin.adminOverviewPage.verifierMesPermissions')}</Button>
          {can('moderation.review') && (
            <Button to="/admin/moderation" size="sm">
              Traiter les signalements ({reportsCount})
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">{t('admin.adminOverviewPage.utilisateursEnregistres')}</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-900">{usersCount}</div>
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <span className="text-success font-bold">100%</span> partitionnés par rôle
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">{t('admin.adminOverviewPage.verificationsProEnAttente')}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-warning">{pendingVerifications.length}</div>
          <div className="text-xs text-stone-500 mt-1">
            {pendingVerifications.length > 0 ? 'Dossiers KBIS à valider' : 'Tous les dossiers sont traités'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">Signalements ouverts</span>
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary">{reportsCount}</div>
          <div className="text-xs text-stone-500 mt-1">{t('admin.adminOverviewPage.conformiteEtSecurite')}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">{t('admin.adminOverviewPage.catalogueDAnnonces')}</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-black text-stone-900">{listingsCount}</div>
          <div className="text-xs text-stone-500 mt-1">{t('admin.adminOverviewPage.offresActivesEtArchivees')}</div>
        </div>
      </div>

      {/* Grid: Pending Pro Dossiers & Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Pro Verifications */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900">{t('admin.adminOverviewPage.dossiersProfessionnelsAVerifier')}</h2>
            </div>
            <Link
              to="/admin/utilisateurs"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >{t('admin.adminOverviewPage.gerer')}<ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingVerifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 rounded-lg border border-dashed border-stone-200">
              <CheckCircle2 className="w-8 h-8 text-success mb-2" />
              <div className="text-xs font-bold text-stone-700">Aucun dossier en attente</div>
              <div className="text-xs text-stone-500">{t('admin.adminOverviewPage.toutesLesImmatriculationsKbisSoumises')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVerifications.map((pro) => (
                <div
                  key={pro.id}
                  className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={pro.avatarUrl}
                      alt={pro.name}
                      sizes="36px"
                      className="w-9 h-9 rounded-full object-cover border border-stone-200"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{pro.companyName || pro.name}</span>
                        <span className="text-micro bg-warning-surface text-warning font-bold px-2 py-1 rounded-sm">
                          En attente
                        </span>
                      </div>
                      <div className="text-xs text-stone-500">
                        SIRET: {pro.siret || 'En attente'} • {pro.city}
                      </div>
                    </div>
                  </div>

                  <Button
                    to="/admin/utilisateurs"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Examiner
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Security Audit Trail */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900">{t('admin.adminOverviewPage.dernieresActionsDAuditSecurite')}</h2>
            </div>
            {can('audit.read') && (
              <Link
                to="/admin/audit"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Journal complet <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="space-y-2.5">
            {recentAudits.map((log) => (
              <div
                key={log.id}
                className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {auditActionLabel(log.action)}
                  </span>
                  <span className="text-micro text-stone-500 shrink-0">
                    {formatLogTimestamp(log.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-stone-600 line-clamp-1">{log.details}</div>
                <div className="text-micro text-stone-500">{t('admin.adminOverviewPage.par')}<strong className="text-stone-700">{log.actorName}</strong> ({roleLabel(log.actorRole)})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
