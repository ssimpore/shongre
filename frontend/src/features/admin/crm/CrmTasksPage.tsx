import React, { useState, useEffect } from 'react';
import {
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '../../../design-system/primitives/Button';
import { Badge } from '../../../design-system/primitives/Badge';
import { Modal } from '../../../design-system/primitives/Modal';
import { FormField, Input, Select } from '../../../design-system/primitives/FormField';
import { crmRepository } from '../../../repositories/crm.repository';
import { CrmTask, TaskPriority } from '../../../domains/crm/crm.types';
import { useToast } from '../../../app/providers/ToastProvider';
import { Skeleton, EmptyState } from '../../../design-system/primitives/UIComponents';
import { useTranslation } from '../../../i18n/I18nProvider';

export const CrmTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Task Form
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [relatedTitle, setRelatedTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const list = await crmRepository.listTasks();
      setTasks(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleStatus = async (id: string) => {
    try {
      await crmRepository.toggleTaskStatus(id);
      fetchTasks();
      toast.success('Statut de la tâche mis à jour.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Le titre de la tâche est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    try {
      await crmRepository.createTask({
        title: title.trim(),
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        relatedType: 'company',
        relatedId: 'crm-comp-1',
        relatedTitle: relatedTitle.trim() || 'Compte client',
        priority,
      });

      setIsModalOpen(false);
      setTitle('');
      setDueDate('');
      setRelatedTitle('');
      fetchTasks();
      toast.success('Tâche créée.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Tâches & Relances Commerciales
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Suivi des actions, appels, démos et signatures à finaliser.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="font-bold flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('admin.crmTasksPage.nouvelleTache')}</span>
        </Button>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            filter === 'pending' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          À faire ({tasks.filter((t) => t.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            filter === 'completed' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Terminées ({tasks.filter((t) => t.status === 'completed').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Toutes ({tasks.length})
        </button>
      </div>

      {/* 3. Tasks Stream */}
      <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs overflow-hidden">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-8 h-8 text-stone-500" />}
            title={t('admin.crmTasksPage.aucuneTacheDansCetteVue')}
            description={t('admin.crmTasksPage.lesRelancesPlanifieesApparaitrontIci')}
            className="border-0 shadow-none"
            action={
              filter === 'all' ? (
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                  Créer une tâche
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                  Voir toutes les tâches
                </Button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredTasks.map((t) => {
              const isCompleted = t.status === 'completed';

              return (
                <div
                  key={t.id}
                  className="py-4 flex items-center justify-between gap-4 hover:bg-stone-50 -mx-4 px-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(t.id)}
                      role="checkbox"
                      aria-checked={isCompleted}
                      aria-label={
                        isCompleted
                          ? `Marquer « ${t.title} » comme à faire`
                          : `Marquer « ${t.title} » comme terminée`
                      }
                      className="text-stone-500 hover:text-stone-800 cursor-pointer shrink-0"
                    >
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-success" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <span
                        className={`font-bold text-xs block ${
                          isCompleted ? 'text-stone-500 line-through' : 'text-stone-900'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="text-micro text-stone-500 block truncate">
                        Lié à : <strong>{t.relatedTitle}</strong> • Échéance : {t.dueDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={t.priority === 'high' || t.priority === 'urgent' ? 'urgent' : 'neutral'} size="sm">
                      {t.priority}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('admin.crmTasksPage.creerUneTache')}
        description={t('admin.crmTasksPage.ajoutezUnRappelOuUne')}
      >
        <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
          <FormField label={t('admin.crmTasksPage.titreDeLaTache')} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('admin.crmTasksPage.exRelancerMarcPourSignature')}
            />
          </FormField>

          <FormField label={t('admin.crmTasksPage.compteOuContactAssocie')}>
            <Input
              value={relatedTitle}
              onChange={(e) => setRelatedTitle(e.target.value)}
              placeholder="ex: L'Atelier Nordique"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('admin.crmTasksPage.dateDEcheance')}>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>

            <FormField label={t('admin.crmTasksPage.priorite')}>
              <Select
                aria-label={t('admin.crmTasksPage.prioriteDeLaTache')}
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                options={[
                  { value: 'low', label: 'Basse' },
                  { value: 'medium', label: 'Moyenne' },
                  { value: 'high', label: 'Haute' },
                  { value: 'urgent', label: 'Urgente' },
                ]}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="font-bold">
              {isSubmitting ? 'Création...' : 'Créer la tâche'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
