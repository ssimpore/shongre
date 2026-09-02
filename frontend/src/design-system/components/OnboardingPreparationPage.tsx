import React, { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "../primitives/Button";

export interface OnboardingPreparationItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface OnboardingPreparationPageProps {
  eyebrow: string;
  title: string;
  description: string;
  checklistTitle: string;
  items: readonly OnboardingPreparationItem[];
  actionLabel: string;
  durationLabel: string;
  statusLabel: string;
  onStart: () => void;
  isReady?: boolean;
  skipNextTimeLabel?: string;
  skipNextTime?: boolean;
  onSkipNextTimeChange?: (checked: boolean) => void;
}

export const OnboardingPreparationPage: React.FC<
  OnboardingPreparationPageProps
> = ({
  eyebrow,
  title,
  description,
  checklistTitle,
  items,
  actionLabel,
  durationLabel,
  statusLabel,
  onStart,
  isReady = true,
  skipNextTimeLabel,
  skipNextTime = false,
  onSkipNextTimeChange,
}) => {
  const headingId = useId();

  return (
    <div className="mx-auto min-w-0 max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section
        aria-labelledby={headingId}
        className="min-w-0 overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs"
      >
        <div className="grid min-w-0 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-10 lg:p-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </span>
            <h1
              id={headingId}
              className="mt-2 max-w-xl text-3xl font-black tracking-tight text-stone-900 sm:text-4xl"
            >
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
              {description}
            </p>

            <div className="mt-8 flex min-w-0 flex-col items-stretch gap-3 sm:items-start">
              <Button
                variant="primary"
                size="md"
                onClick={onStart}
                disabled={!isReady}
                rightIcon={<ArrowRight className="h-icon-md w-icon-md" />}
                className="w-full min-w-0 !whitespace-normal sm:w-auto"
              >
                {actionLabel}
              </Button>
              {skipNextTimeLabel && onSkipNextTimeChange ? (
                <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold text-text-secondary">
                  <input
                    type="checkbox"
                    checked={skipNextTime}
                    onChange={(event) =>
                      onSkipNextTimeChange(event.currentTarget.checked)
                    }
                    className="h-4 w-4 rounded border-border-strong accent-primary"
                  />
                  <span>{skipNextTimeLabel}</span>
                </label>
              ) : null}
              <span className="inline-flex min-w-0 items-start gap-1.5 text-xs font-medium leading-relaxed text-stone-500">
                <Clock3
                  className="mt-0.5 h-icon-md w-icon-md shrink-0"
                  aria-hidden="true"
                />
                <span>{durationLabel}</span>
              </span>
            </div>

            <p
              className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-stone-500"
              aria-live="polite"
            >
              <ShieldCheck
                className="mt-0.5 h-icon-md w-icon-md shrink-0 text-success"
                aria-hidden="true"
              />
              <span>{statusLabel}</span>
            </p>
          </div>

          <div className="min-w-0 border-t border-border-base bg-bg-subtle p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <h2 className="text-sm font-black text-stone-900">
              {checklistTitle}
            </h2>
            <ul className="mt-4 divide-y divide-border-base">
              {items.map(
                ({ title: itemTitle, description: itemBody, icon: Icon }) => (
                  <li key={itemTitle} className="flex gap-3 py-4 first:pt-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
                      <Icon
                        className="h-icon-md w-icon-md"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-stone-900">
                        {itemTitle}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-stone-600">
                        {itemBody}
                      </span>
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
