import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MoreVertical,
  ShieldCheck,
  Star,
  UserX,
  UserCheck,
  Flag,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  ConversationParticipant,
  ConversationCapabilities,
} from "../../../domains/messaging/messaging.types";
import { Avatar, Badge } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";
import { routes } from "../../../configuration/routes";

interface ConversationHeaderProps {
  counterpart: ConversationParticipant;
  capabilities: ConversationCapabilities;
  onBack?: () => void;
  onBlockToggle: () => void;
  onReport: () => void;
  onSimulateReply?: () => void;
  publicProfileSlug?: string;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  counterpart,
  capabilities,
  onBack,
  onBlockToggle,
  onReport,
  onSimulateReply,
  publicProfileSlug,
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const publicProfileUrl = publicProfileSlug
    ? routes.seller.publicPage({
        id: counterpart.id,
        slug: publicProfileSlug,
        isProfessional: counterpart.accountType === "pro",
      })
    : null;

  return (
    <div className="p-3.5 sm:px-5 bg-white border-b border-border-base flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label={t(
              "messaging.conversationHeader.retourAuxConversations",
            )}
          >
            <ArrowLeft className="w-icon-lg h-icon-lg" />
          </button>
        )}

        {/* Counterpart Identity */}
        {publicProfileUrl ? (
          <Link
            to={publicProfileUrl}
            className="relative shrink-0 rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Avatar
              name={counterpart.name}
              src={counterpart.avatarUrl}
              size="md"
            />
          </Link>
        ) : (
          <div className="relative shrink-0">
            <Avatar
              name={counterpart.name}
              src={counterpart.avatarUrl}
              size="md"
            />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {publicProfileUrl ? (
              <Link
                to={publicProfileUrl}
                className="truncate rounded-control text-sm font-bold text-stone-900 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {counterpart.name}
              </Link>
            ) : (
              <span className="truncate text-sm font-bold text-stone-900">
                {counterpart.name}
              </span>
            )}
            {counterpart.isVerified && (
              <span title={t("messaging.conversationHeader.identiteVerifiee")}>
                <ShieldCheck className="w-icon-md h-icon-md text-success shrink-0" />
              </span>
            )}
            {counterpart.accountType === "pro" && (
              <Badge variant="neutral" size="sm">
                PRO
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-micro text-stone-500 font-medium">
            {counterpart.rating !== undefined && (
              <span className="flex items-center gap-0.5 text-warning font-bold">
                <Star className="w-icon-xs h-icon-xs fill-amber-400 text-amber-400" />
                <span>{counterpart.rating.toFixed(1)}</span>
                {counterpart.reviewCount !== undefined && (
                  <span>({counterpart.reviewCount})</span>
                )}
              </span>
            )}
            {capabilities.isBlockedByViewer ? (
              <span className="text-danger font-bold">
                {t("messaging.conversationHeader.utilisateurBloque")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-success font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span>En ligne</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {onSimulateReply && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSimulateReply}
            leftIcon={
              <Sparkles className="w-icon-sm h-icon-sm text-amber-500" />
            }
            className="hidden sm:inline-flex text-xs"
          >
            {t("messaging.conversationHeader.simulerReponse")}
          </Button>
        )}

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
            aria-label={t(
              "messaging.conversationHeader.optionsDeLaConversation",
            )}
          >
            <MoreVertical className="w-icon-md h-icon-md" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-sticky"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-border-base p-1 z-dropdown space-y-0.5 text-xs font-semibold">
                {publicProfileUrl && (
                  <Link
                    to={publicProfileUrl}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    <ExternalLink className="w-icon-md h-icon-md text-stone-400" />
                    <span>
                      {t("messaging.conversationHeader.voirLeProfilPublic")}
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onBlockToggle();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    capabilities.isBlockedByViewer
                      ? "text-success hover:bg-success-surface"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {capabilities.isBlockedByViewer ? (
                    <>
                      <UserCheck className="w-icon-md h-icon-md text-success" />
                      <span>
                        {t(
                          "messaging.conversationHeader.debloquerLUtilisateur",
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-icon-md h-icon-md text-stone-500" />
                      <span>Bloquer cet utilisateur</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onReport();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-danger hover:bg-danger-surface text-left transition-colors"
                >
                  <Flag className="w-icon-md h-icon-md text-danger" />
                  <span>
                    {t("messaging.conversationHeader.signalerLaConversation")}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
