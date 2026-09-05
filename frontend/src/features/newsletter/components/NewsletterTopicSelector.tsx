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
  deals: <Tag className="w-icon-md h-icon-md text-rating-strong" />,
  editorial: <Sparkles className="w-icon-md h-icon-md text-primary" />,
  seller_tips: <Lightbulb className="w-icon-md h-icon-md text-success" />,
  pro_insights: <Briefcase className="w-icon-md h-icon-md text-info" />,
  new_features: <Zap className="w-icon-md h-icon-md text-insight-highlight" />,
  local_trends: <MapPin className="w-icon-md h-icon-md text-danger" />,
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
                ? "border-primary bg-primary-surface-soft text-text-main ring-1 ring-primary-ring"
                : "border-border-base bg-bg-surface text-text-emphasis hover:bg-surface-soft"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="p-2 rounded-xl bg-surface-muted shrink-0 mt-0.5">
              {TOPIC_ICONS[t.id] || (
                <Sparkles className="w-icon-md h-icon-md" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-bold text-text-main block leading-tight">
                  {t.label}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Handled by container click
                  disabled={disabled}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border-prominent pointer-events-none"
                />
              </div>
              <p className="text-micro text-text-tertiary line-clamp-2 leading-relaxed">
                {t.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
};
