import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Plus,
  Send,
} from 'lucide-react';
import { CrmActivity, ActivityType } from '../../../../domains/crm/crm.types';
import { Button } from '../../../../design-system/primitives/Button';
import { formatDate } from '../../../../utilities/formatters';

interface ActivityTimelineProps {
  activities: CrmActivity[];
  onAddNote?: (noteText: string) => Promise<void>;
  loading?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  onAddNote,
  loading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'notes' | 'ai' | 'milestones'>('all');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !onAddNote) return;

    setIsSubmitting(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = activities.filter((a) => {
    if (filter === 'notes') return a.type === 'note';
    if (filter === 'ai') return a.isAiGenerated;
    if (filter === 'milestones') return a.type === 'stage_changed' || a.type === 'pro_conversion';
    return true;
  });

  const getActivityIcon = (type: ActivityType, isAi?: boolean) => {
    if (isAi) return <Sparkles className="w-4 h-4 text-purple-600" />;
    switch (type) {
      case 'note':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'call':
        return <Phone className="w-4 h-4 text-emerald-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-stone-600" />;
      case 'stage_changed':
      case 'pro_conversion':
        return <TrendingUp className="w-4 h-4 text-amber-600" />;
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Note Composer */}
      {onAddNote && (
        <form onSubmit={handleAddNote} className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ajouter une note commerciale, compte-rendu d'appel ou remarque..."
            rows={2}
            className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl placeholder:text-stone-500 focus:outline-none focus:border-primary transition-colors"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !newNote.trim()}
              className="font-bold"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Publier la note'}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-lg font-bold text-micro transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Tous ({activities.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('notes')}
          className={`px-2.5 py-1 rounded-lg font-bold text-micro transition-colors cursor-pointer ${
            filter === 'notes' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Notes
        </button>
        <button
          type="button"
          onClick={() => setFilter('ai')}
          className={`px-2.5 py-1 rounded-lg font-bold text-micro transition-colors cursor-pointer ${
            filter === 'ai' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Événements IA
        </button>
        <button
          type="button"
          onClick={() => setFilter('milestones')}
          className={`px-2.5 py-1 rounded-lg font-bold text-micro transition-colors cursor-pointer ${
            filter === 'milestones' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Étapes & Pipeline
        </button>
      </div>

      {/* Timeline Stream */}
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-stone-500">
          Aucune activité enregistrée pour ce filtre.
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
          {filtered.map((act) => (
            <div key={act.id} className="relative pl-9 space-y-1">
              <div className="absolute left-2 top-0.5 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-xs">
                {getActivityIcon(act.type, act.isAiGenerated)}
              </div>

              <div className="bg-white border border-border-base rounded-xl p-3 shadow-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-stone-900 text-xs">
                    {act.title}
                  </span>
                  <span className="text-micro text-stone-500 font-mono">
                    {formatDate(act.createdAt)}
                  </span>
                </div>

                {act.description && (
                  <p className="text-stone-700 leading-relaxed text-micro">
                    {act.description}
                  </p>
                )}

                <div className="text-micro text-stone-500 pt-0.5">
                  Par : <strong className="text-stone-600">{act.authorName}</strong>{' '}
                  {act.authorRole && `(${act.authorRole})`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
