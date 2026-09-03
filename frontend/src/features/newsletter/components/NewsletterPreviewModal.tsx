import React, { useState } from "react";
import { Image } from "../../../design-system";
import type { MarketingCampaign } from "@shongre/contracts";
import { Monitor, Smartphone } from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";

interface NewsletterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: MarketingCampaign;
}

export const NewsletterPreviewModal: React.FC<NewsletterPreviewModalProps> = ({
  isOpen,
  onClose,
  campaign,
}) => {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Aperçu email · ${campaign.name}`}
      description="Rendu indicatif à partir de la version immuable de la campagne."
    >
      <div className="space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-100 p-2">
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Largeur de prévisualisation"
          >
            {(["desktop", "mobile"] as const).map((mode) => {
              const Icon = mode === "desktop" ? Monitor : Smartphone;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`flex min-h-control-sm items-center gap-1.5 rounded-control px-3 font-semibold transition-colors ${
                    viewMode === mode
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {mode === "desktop" ? "Ordinateur" : "Mobile"}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-micro text-stone-500">
            v{campaign.currentVersion} · {campaign.locale}
          </span>
        </div>

        <div className="space-y-1 rounded-xl border border-border-base bg-stone-50 p-3">
          <p>
            <strong className="mr-2 text-stone-500">Objet</strong>
            {campaign.subject}
          </p>
          {campaign.previewText && (
            <p className="truncate text-stone-500">
              <strong className="mr-2">Préheader</strong>
              {campaign.previewText}
            </p>
          )}
        </div>

        <div className="flex justify-center overflow-x-auto rounded-2xl bg-stone-200 p-4">
          <article
            className={`overflow-hidden rounded-2xl border border-stone-300 bg-white text-stone-800 shadow-sm transition-all ${
              viewMode === "mobile" ? "w-full max-w-sm" : "w-full max-w-2xl"
            }`}
          >
            <header className="flex items-center justify-between bg-stone-950 px-6 py-5 text-white">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-base font-bold">
                  S
                </span>
                <span className="text-base font-bold">Shongre</span>
              </div>
              <span className="text-micro font-bold uppercase tracking-wider text-stone-400">
                Marketing
              </span>
            </header>
            <div className="space-y-4 px-6 py-7">
              {campaign.content.blocks.map((block) => {
                if (block.type === "HEADING")
                  return (
                    <h2
                      key={block.id}
                      className="text-xl font-bold leading-tight text-stone-950"
                    >
                      {block.text}
                    </h2>
                  );
                if (block.type === "PARAGRAPH")
                  return (
                    <p
                      key={block.id}
                      className="text-sm leading-6 text-stone-700"
                    >
                      {block.text}
                    </p>
                  );
                if (block.type === "IMAGE")
                  return (
                    <Image
                      key={block.id}
                      src={block.src}
                      alt={block.alt}
                      className="w-full rounded-xl object-cover"
                    />
                  );
                if (block.type === "BUTTON")
                  return (
                    <div key={block.id} className="py-2 text-center">
                      <span className="inline-flex min-h-control-md items-center rounded-control bg-primary px-5 font-bold text-white">
                        {block.label}
                      </span>
                    </div>
                  );
                if (block.type === "DIVIDER")
                  return <hr key={block.id} className="border-border-subtle" />;
                if (block.type === "SPACER")
                  return (
                    <div
                      key={block.id}
                      aria-hidden
                      className={
                        block.size === "LG"
                          ? "h-8"
                          : block.size === "MD"
                            ? "h-5"
                            : "h-3"
                      }
                    />
                  );
                if (
                  block.type === "UNSUBSCRIBE" ||
                  block.type === "PREFERENCE_CENTER" ||
                  block.type === "FOOTER"
                )
                  return (
                    <p
                      key={block.id}
                      className="text-center text-micro leading-5 text-stone-500 underline-offset-2"
                    >
                      {block.text ??
                        (block.type === "UNSUBSCRIBE"
                          ? "Se désabonner"
                          : block.type === "PREFERENCE_CENTER"
                            ? "Gérer mes préférences"
                            : "Shongre SAS · Paris")}
                    </p>
                  );
                return null;
              })}
            </div>
            <footer className="border-t border-stone-200 bg-stone-100 px-6 py-4 text-center text-micro text-stone-500">
              Finalité MARKETING · désabonnement immédiat et préférences
              accessibles sans connexion.
            </footer>
          </article>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer l’aperçu
          </Button>
        </div>
      </div>
    </Modal>
  );
};
