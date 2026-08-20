import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  
  
  
  Clock,
  PlusCircle,
  
  ExternalLink
} from 'lucide-react';
import { Button } from '../../../design-system/primitives/Button';
import { StatePanel } from '../../../design-system/primitives/StatePanel';
import { Badge } from '../../../design-system/primitives/Badge';
import { Modal } from '../../../design-system/primitives/Modal';
import { FormField, Input, Select } from '../../../design-system/primitives/FormField';
import { crmRepository } from '../../../repositories/crm.repository';
import { userRepository } from '../../../repositories/user.repository';
import { CrmContact, CrmActivity, CrmTask, ContactLifecycle } from '../../../domains/crm/crm.types';
import { crmService } from '../../../domains/crm/crm.service';
import { ActivityTimeline } from './components/ActivityTimeline';
import { useToast } from '../../../app/providers/ToastProvider';
import { formatDate } from '../../../utilities/formatters';
import { Skeleton } from '../../../design-system';
import { useTranslation } from '../../../i18n/I18nProvider';
import { usePageMeta } from '../../../hooks/usePageMeta';

export const CrmContactDetailPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.crmContactDetail.title'),
    description: t('meta.crmContactDetail.description'),
    noIndex: true,
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [contact, setContact] = useState<CrmContact | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [linkedUser, setLinkedUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // New Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const fetchContactData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await crmRepository.getContactById(id);
      setContact(c);
      if (c) {
        const [acts, allTasks] = await Promise.all([
          crmRepository.listActivities('contact', c.id),
          crmRepository.listTasks(),
        ]);
        setActivities(acts);
        setTasks(allTasks.filter((t) => t.relatedType === 'contact' && t.relatedId === c.id));

        if (c.linkedUserId) {
          const u = await userRepository.getUserById(c.linkedUserId);
          setLinkedUser(u);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactData();
  }, [id]);

  const handleUpdateLifecycle = async (newLifecycle: ContactLifecycle) => {
    if (!contact) return;
    try {
      const updated = await crmRepository.updateContact(contact.id, {
        lifecycle: newLifecycle,
        doNotContact: newLifecycle === 'do_not_contact',
      });
      setContact(updated);
      toast.success('Statut commercial mis à jour.', 'Contact actualisé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleAddNote = async (noteText: string) => {
    if (!contact) return;
    await crmRepository.addActivity({
      entityType: 'contact',
      entityId: contact.id,
      type: 'note',
      title: 'Note commerciale',
      description: noteText,
      authorName: 'Antoine Fabre',
      authorRole: 'Admin',
    });
    const updated = await crmRepository.listActivities('contact', contact.id);
    setActivities(updated);
    toast.success('Note enregistrée.');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !taskTitle.trim()) return;

    try {
      await crmRepository.createTask({
        title: taskTitle.trim(),
        dueDate: taskDueDate || new Date().toISOString().split('T')[0],
        relatedType: 'contact',
        relatedId: contact.id,
        relatedTitle: `${contact.identity.firstName} ${contact.identity.lastName}`,
        priority: 'medium',
      });

      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDueDate('');
      fetchContactData();
      toast.success('Tâche planifiée avec succès.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création de la tâche.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!contact) {
    return (
      <StatePanel
        variant="notFound"
        title="Contact introuvable"
        description={t('admin.crmContactDetailPage.ceContactNExistePlus')}
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/crm/contacts')}>{t('admin.crmContactDetailPage.retourAuxContacts')}</Button>
        }
      />
    );
  }

  const lifecycleInfo = crmService.getLifecycleInfo(contact.lifecycle);
  const qualInfo = crmService.getQualificationInfo(contact.qualification);

  return (
    <div className="space-y-6">
      {/* 1. Header & Back Link */}
      <div className="flex items-center gap-2">
        <Link
          to="/admin/crm/contacts"
          className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('admin.crmContactDetailPage.tousLesContacts')}</span>
        </Link>
      </div>

      {/* 2. Contact 360 Card */}
      <div className="bg-white border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-stone-800 text-lg shrink-0">
              {contact.identity.firstName[0]}{contact.identity.lastName[0] || ''}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-stone-900">
                  {contact.identity.firstName} {contact.identity.lastName}
                </h1>
                <Badge variant={lifecycleInfo.variant} size="sm">
                  {lifecycleInfo.label}
                </Badge>
                <span className={`px-2 py-0.5 rounded-md text-micro font-bold ${qualInfo.badgeClass}`}>
                  {qualInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <strong>{contact.identity.email}</strong>
                </span>
                {contact.identity.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{contact.identity.phone}</span>
                  </span>
                )}
                {contact.companyName && (
                  <span className="flex items-center gap-1 text-primary font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{contact.companyName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTaskModalOpen(true)}
              className="font-bold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('admin.crmContactDetailPage.planifierUneTache')}</span>
            </Button>
          </div>
        </div>

        {/* Lifecycle & Status Switcher */}
        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-500">{t('admin.crmContactDetailPage.changerDeStatut')}</span>
            <Select
              aria-label={t('admin.crmContactDetailPage.cycleDeVieDuContact')}
              value={contact.lifecycle}
              onChange={(e) => handleUpdateLifecycle(e.target.value as ContactLifecycle)}
              options={[
                { value: 'prospect', label: 'Prospect' },
                { value: 'qualified', label: 'Qualifié' },
                { value: 'customer', label: 'Client / Pro' },
                { value: 'partner', label: 'Partenaire' },
                { value: 'do_not_contact', label: 'Ne pas contacter' },
              ]}
            />
          </div>

          <span className="text-stone-500 text-micro">
            Responsable : <strong>{contact.ownerName || 'Non assigné'}</strong> • Marché : {contact.marketCode}
          </span>
        </div>
      </div>

      {/* 3. Linked Shongre Account (if available) */}
      {linkedUser && (
        <div className="bg-success-surface border border-success-border rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success">
              <ShieldCheck className="w-5 h-5 text-success" />
              <h2 className="text-sm font-black">{t('admin.crmContactDetailPage.comptePlateformeShongreRattache')}</h2>
            </div>
            <Link
              to={linkedUser.sellerType === 'pro' ? `/vendeur/${linkedUser.slug || linkedUser.id}` : '#'}
              className="text-xs font-bold text-success hover:underline flex items-center gap-1"
            >
              <span>{t('admin.crmContactDetailPage.voirLaVitrinePublique')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-success text-micro block">{t('admin.crmContactDetailPage.typeDeCompte')}</span>
              <strong className="text-success">{linkedUser.sellerType === 'pro' ? 'Vendeur Professionnel' : 'Particulier'}</strong>
            </div>
            <div>
              <span className="text-success text-micro block">Membre depuis</span>
              <strong className="text-success">{formatDate(linkedUser.createdAt)}</strong>
            </div>
            <div>
              <span className="text-success text-micro block">{t('admin.crmContactDetailPage.noteVendeur')}</span>
              <strong className="text-success">{linkedUser.rating || 5.0} / 5.0 ({linkedUser.reviewCount || 0} avis)</strong>
            </div>
            <div>
              <span className="text-success text-micro block">Localisation</span>
              <strong className="text-success">{linkedUser.city || 'France'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 4. Split: Activity Stream & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-stone-900">{t('admin.crmContactDetailPage.historiqueDesEchangesNotes')}</h2>
          <ActivityTimeline activities={activities} onAddNote={handleAddNote} />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-black text-stone-900">{t('admin.crmContactDetailPage.tachesAssociees')}</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsTaskModalOpen(true)}>{t('admin.crmContactDetailPage.tache')}</Button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-4">{t('admin.crmContactDetailPage.aucuneTachePlanifiee')}</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                    <span className="font-bold text-stone-900 block">{t.title}</span>
                    <span className="text-micro text-stone-500">Pour le {t.dueDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={t('admin.crmContactDetailPage.planifierUneTache')}
        description={`Ajouter une tâche pour ${contact.identity.firstName} ${contact.identity.lastName}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
          <FormField label={t('admin.crmContactDetailPage.titreDeLaTache')} required>
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={t('admin.crmContactDetailPage.exRappelerPourPlanifierLa')}
            />
          </FormField>

          <FormField label={t('admin.crmContactDetailPage.dateDEcheance')} required>
            <Input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTaskModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
