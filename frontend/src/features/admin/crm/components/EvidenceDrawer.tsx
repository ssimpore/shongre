import React from 'react';
import { ExternalLink, ShieldCheck,  CheckCircle2, AlertTriangle } from 'lucide-react';
import { Drawer } from '../../../../design-system/primitives/Modal';
import { Badge } from '../../../../design-system/primitives/Badge';
import { ProspectResearchCandidate } from '../../../../domains/crm/crm.types';
import { useTranslation } from '../../../../i18n/I18nProvider';

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
      title={`Sources & Rationale : ${candidate.company.name}`}
      position="right"
      className="max-w-lg"
    >
      <div className="space-y-6 text-xs text-stone-700">
        {/* Fit Score Header */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-900 text-xs">{t('admin.evidenceDrawer.fitShongreEstime')}</span>
            <span className="text-base font-black text-primary">
              {candidate.fit.score} / 100
            </span>
          </div>

          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${candidate.fit.score}%` }}
            />
          </div>
        </div>

        {/* Reasons & Signals */}
        <div className="space-y-2">
          <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider">{t('admin.evidenceDrawer.pourquoiCetteEntrepriseCorrespond')}</h4>
          <div className="space-y-2">
            {candidate.fit.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 bg-stone-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="text-stone-800 leading-relaxed text-xs">{reason}</span>
              </div>
            ))}
          </div>

          {candidate.fit.caveats && candidate.fit.caveats.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="font-bold text-warning text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                Points d'attention :
              </span>
              {candidate.fit.caveats.map((cav, idx) => (
                <p key={idx} className="text-xs text-stone-600 italic pl-5">
                  • {cav}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Public Sources Provenance */}
        <div className="space-y-3 pt-2">
          <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider">
            Sources publiques analysées ({candidate.sources.length})
          </h4>

          <div className="space-y-3">
            {candidate.sources.map((src) => (
              <div key={src.id} className="p-3.5 border border-stone-200 rounded-2xl bg-white space-y-2 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="neutral" size="sm">
                    {src.sourceType}
                  </Badge>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-bold text-micro"
                  >
                    <span>{t('admin.evidenceDrawer.consulterLaSource')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h5 className="font-bold text-stone-900 text-xs">{src.title}</h5>

                {src.snippet && (
                  <p className="text-micro text-stone-600 bg-stone-50 p-2 rounded-lg font-mono leading-relaxed">
                    "{src.snippet}"
                  </p>
                )}

                <div className="text-micro text-stone-500">
                  URL : <span className="font-mono text-stone-600 truncate">{src.url}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparency Notice */}
        <div className="p-3.5 bg-stone-100 rounded-xl flex items-start gap-2.5 text-micro text-stone-500">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <span>{t('admin.evidenceDrawer.cesInformationsSontIssuesExclusivement')}</span>
        </div>
      </div>
    </Drawer>
  );
};
