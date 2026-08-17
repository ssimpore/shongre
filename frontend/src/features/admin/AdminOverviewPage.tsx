import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Globe,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { storageService } from '../../services/storage.service';
import { auditService } from '../../security/audit.service';
import { ROLE_DEFINITIONS } from '../../security/roles.config';
import { Button } from '../../design-system/primitives/Button';
import { Image } from '../../design-system/primitives/Image';

export const AdminOverviewPage: React.FC = () => {
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
          <p className="text-xs text-stone-600 mt-0.5">
            Vous opérez avec le rôle <strong className="text-stone-900">{roleMeta.title}</strong>{' '}
            sur le périmètre territorial{' '}
            <strong className="text-stone-900">{currentUser?.marketScope?.countries.join(', ') || 'FR'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/roles">
            <Button variant="outline" size="sm" className="text-xs">
              Vérifier mes permissions
            </Button>
          </Link>
          {can('moderation.review') && (
            <Link to="/admin/moderation">
              <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover active:bg-primary-active text-white">
                Traiter les signalements ({reportsCount})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">Utilisateurs enregistrés</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-900">{usersCount}</div>
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <span className="text-success font-bold">100%</span> partitionnés par rôle
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">Vérifications Pro en attente</span>
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
          <div className="text-xs text-stone-500 mt-1">
            Conformité et sécurité
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">Catalogue d'annonces</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{listingsCount}</div>
          <div className="text-xs text-stone-500 mt-1">
            Offres actives et archivées
          </div>
        </div>
      </div>

      {/* Grid: Pending Pro Dossiers & Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Pro Verifications */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900">
                Dossiers Professionnels à Vérifier
              </h2>
            </div>
            <Link
              to="/admin/utilisateurs"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Gérer <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingVerifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 rounded-lg border border-dashed border-stone-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <div className="text-xs font-bold text-stone-700">Aucun dossier en attente</div>
              <div className="text-xs text-stone-500">
                Toutes les immatriculations KBIS soumises ont été vérifiées.
              </div>
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
                      className="w-9 h-9 rounded-full object-cover border border-stone-200"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{pro.companyName || pro.name}</span>
                        <span className="text-micro bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-sm">
                          En attente
                        </span>
                      </div>
                      <div className="text-xs text-stone-500">
                        SIRET: {pro.siret || 'En attente'} • {pro.city}
                      </div>
                    </div>
                  </div>

                  <Link to="/admin/utilisateurs">
                    <Button size="sm" variant="outline" className="text-xs">
                      Examiner
                    </Button>
                  </Link>
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
              <h2 className="text-sm font-bold text-stone-900">
                Dernières Actions d'Audit Sécurité
              </h2>
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
                    {log.action}
                  </span>
                  <span className="text-micro text-stone-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-stone-600 line-clamp-1">{log.details}</div>
                <div className="text-micro text-stone-500">
                  Par: <strong className="text-stone-700">{log.actorName}</strong> ({log.actorRole})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
