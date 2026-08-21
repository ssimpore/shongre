import React from "react";
import { Tag, Sparkles, Lightbulb, Briefcase, Zap, MapPin } from "lucide-react";
import { NewsletterTopic } from "../../../domains/newsletter/newsletter.types";
import { NewsletterTopicDefinition } from "../../../domains/newsletter/newsletter.topics";

interface NewsletterTopicSelectorProps {
  topics: NewsletterTopicDefinition[];
  selectedTopicIds: NewsletterTopic[];
  onChange: (selected: NewsletterTopic[]) => void;
  disabled?: boolean;
}

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  deals: <Tag className="w-4 h-4 text-amber-500" />,
  editorial: <Sparkles className="w-4 h-4 text-primary" />,
  seller_tips: <Lightbulb className="w-4 h-4 text-success" />,
  pro_insights: <Briefcase className="w-4 h-4 text-info" />,
  new_features: <Zap className="w-4 h-4 text-indigo-500" />,
  local_trends: <MapPin className="w-4 h-4 text-danger" />,
};

export const NewsletterTopicSelector: React.FC<
  NewsletterTopicSelectorProps
> = ({ topics, selectedTopicIds, onChange, disabled = false }) => {
  const toggleTopic = (topicId: NewsletterTopic) => {
    if (disabled) return;
    if (selectedTopicIds.includes(topicId)) {
      onChange(selectedTopicIds.filter((id) => id !== topicId));
    } else {
      onChange([...selectedTopicIds, topicId]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {topics.map((t) => {
        const isChecked = selectedTopicIds.includes(t.id);

        return (
          <label
            key={t.id}
            onClick={() => toggleTopic(t.id)}
            className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 select-none cursor-pointer ${
              isChecked
                ? "border-primary bg-primary/5 text-stone-900 ring-1 ring-primary/20"
                : "border-border-base bg-white text-stone-700 hover:bg-stone-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="p-2 rounded-xl bg-stone-100 shrink-0 mt-0.5">
              {TOPIC_ICONS[t.id] || <Sparkles className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-bold text-stone-900 block leading-tight">
                  {t.label}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Handled by container click
                  disabled={disabled}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-stone-300 pointer-events-none"
                />
              </div>
              <p className="text-micro text-stone-500 line-clamp-2 leading-relaxed">
                {t.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
};
