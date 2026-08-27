import React from "react";
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Drawer } from "../../../../design-system/primitives/Modal";
import { Badge } from "../../../../design-system/primitives/Badge";
import { Button } from "../../../../design-system/primitives/Button";
import type { ProspectResearchCandidate } from "../../../../api/contracts/crm-prospecting.contract";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { ProgressBar } from "../../../../design-system/primitives/ProgressBar";

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ProspectResearchCandidate | null;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  const { t } = useTranslation();
  if (!candidate) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.evidenceDrawer.title", {
        company: candidate.company.name,
      })}
      position="right"
    >
      <div className="space-y-6 text-xs text-text-secondary">
        {/* Fit Score Header */}
        <div className="space-y-2 rounded-card border border-primary/20 bg-primary-light p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-main">
              {t("admin.evidenceDrawer.fitShongreEstime")}
            </span>
            <span className="text-base font-black text-primary">
              {candidate.fit.score} / 100
            </span>
          </div>

          <ProgressBar
            value={candidate.fit.score}
            label={t("admin.evidenceDrawer.scoreCompatibilite")}
          />
        </div>

        {/* Reasons & Signals */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-text-main">
            {t("admin.evidenceDrawer.pourquoiCetteEntrepriseCorrespond")}
          </h4>
          <div className="space-y-2">
            {candidate.fit.reasons.map((reason, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-control bg-bg-subtle p-2.5"
              >
                <CheckCircle2 className="w-icon-md h-icon-md text-success shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed text-text-main">
                  {reason}
                </span>
              </div>
            ))}
          </div>

          {candidate.fit.caveats && candidate.fit.caveats.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="font-bold text-warning text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-icon-sm h-icon-sm text-warning" />
                {t("admin.evidenceDrawer.pointsAttention")} :
              </span>
              {candidate.fit.caveats.map((cav, idx) => (
                <p key={idx} className="pl-5 text-xs italic text-text-secondary">
                  • {cav}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Public Sources Provenance */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-text-main">
            {t("admin.evidenceDrawer.sourcesPubliquesAnalysees", {
              count: candidate.sources.length,
            })}
          </h4>

          <div className="space-y-3">
            {candidate.sources.map((src) => (
              <div
                key={src.id}
                className="space-y-2 rounded-card border border-border-base bg-bg-surface p-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="neutral" size="sm">
                    {src.sourceType}
                  </Badge>
                  <Button
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="ghost"
                    size="sm"
                    rightIcon={
                      <ExternalLink className="h-icon-xs w-icon-xs" />
                    }
                  >
                    <span>{t("admin.evidenceDrawer.consulterLaSource")}</span>
                  </Button>
                </div>

                <h5 className="text-xs font-bold text-text-main">
                  {src.title}
                </h5>

                {src.snippet && (
                  <p className="rounded-control bg-bg-subtle p-2 font-mono text-micro leading-relaxed text-text-secondary">
                    "{src.snippet}"
                  </p>
                )}

                <div className="text-micro text-text-muted">
                  {t("admin.evidenceDrawer.url")} :{" "}
                  <span className="truncate font-mono text-text-secondary">
                    {src.url}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparency Notice */}
        <div className="flex items-start gap-2.5 rounded-card bg-bg-muted p-3.5 text-micro text-text-muted">
          <ShieldCheck className="w-icon-md h-icon-md text-success shrink-0 mt-0.5" />
          <span>
            {t("admin.evidenceDrawer.cesInformationsSontIssuesExclusivement")}
          </span>
        </div>
      </div>
    </Drawer>
  );
};
