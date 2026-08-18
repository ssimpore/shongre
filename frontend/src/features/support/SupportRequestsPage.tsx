import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  PlusCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { SupportRequest, SupportRequestStatus } from '../../domains/support/support.types';
import { supportService } from '../../domains/support/support.service';
import { supportRepository } from '../../repositories/support.repository';
import { formatDate } from '../../utilities/formatters';
import { Skeleton } from '../../design-system/primitives/UIComponents';

export const SupportRequestsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const res = await supportRepository.getRequests({
          requesterId: currentUser.id,
          status: filterStatus as SupportRequestStatus | 'all',
        });
        setRequests(res.requests);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [currentUser, filterStatus]);

  const tabs = [
    { id: 'all', label: 'Toutes les demandes' },
    { id: 'waiting_for_user', label: 'Action requise' },
    { id: 'in_progress', label: 'En cours' },
    { id: 'resolved', label: 'Résolues' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">Aide & Assistance</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Suivez l'état de vos dossiers et échangez directement avec le service client Shongre.
          </p>
        </div>

        <Button
          to="/contact"
          variant="primary"
          size="sm"
          className="font-bold flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nouvelle demande</span>
        </Button>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border-subtle">
        {tabs.map((tab) => {
          const isActive = filterStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Requests List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-border-base rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Headphones className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-black text-stone-900">Aucune demande en cours</h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Si vous rencontrez une difficulté avec une transaction, une annonce ou votre compte, notre équipe est à votre disposition.
            </p>
          </div>
          <Button
            to="/contact"
            variant="outline"
            size="sm"
            className="font-bold"
          >
            Contacter le support
          </Button>
        </div>
      ) : (
        <section aria-labelledby="support-requests-heading" className="space-y-3">
          <h2 id="support-requests-heading" className="sr-only">
            Mes demandes d'assistance
          </h2>
          {requests.map((req) => {
            const statusInfo = supportService.getStatusInfo(req.status);

            return (
              <div
                key={req.id}
                onClick={() => navigate(`/compte/support/${req.id}`)}
                className="bg-white border border-border-base rounded-2xl p-4 sm:p-5 shadow-xs hover:border-stone-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-micro font-bold font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {req.reference}
                    </span>
                    <Badge variant={statusInfo.variant} size="sm">
                      {statusInfo.label}
                    </Badge>
                    <span className="text-micro text-stone-500">
                      Mis à jour le {formatDate(req.lastActivityAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-stone-900 group-hover:text-primary transition-colors truncate">
                    {req.subject}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-1">
                    {req.messages[req.messages.length - 1]?.content || req.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                    <MessageSquare className="w-4 h-4" />
                    <span>{req.messages.length}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};
