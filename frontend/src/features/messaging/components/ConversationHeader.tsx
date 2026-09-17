import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MoreVertical,
  Star,
  UserX,
  UserCheck,
  Flag,
  ExternalLink,
} from "lucide-react";
import { ProBadge, VerifiedIcon } from "@shongre/ui/web";
import {
  ConversationParticipant,
  ConversationCapabilities,
} from "../../../domains/messaging/messaging.types";
import { Avatar } from "../../../design-system/primitives/Badge";
import { useTranslation } from "../../../i18n/I18nProvider";
import { routes } from "../../../configuration/routes";
import type { UserPresence } from "@shongre/shared/presence";
import { PresenceStatus } from "./PresenceStatus";

interface ConversationHeaderProps {
  presence?: UserPresence;
  counterpart: ConversationParticipant;
  capabilities: ConversationCapabilities;
  onBack?: () => void;
  onBlockToggle: () => void;
  onReport: () => void;
  publicProfileSlug?: string;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  counterpart,
  presence,
  capabilities,
  onBack,
  onBlockToggle,
  onReport,
  publicProfileSlug,
}) => {
  const { t, locale } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const publicProfileUrl = publicProfileSlug
    ? routes.seller.publicPage({
        id: counterpart.id,
        slug: publicProfileSlug,
        isProfessional: counterpart.accountType === "pro",
      })
    : null;

  return (
    <div className="p-3.5 sm:px-5 bg-bg-surface border-b border-border-base flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-text-supporting hover:text-text-main rounded-lg hover:bg-surface-muted transition-colors"
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
                className="truncate rounded-control text-sm font-bold text-text-main transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {counterpart.name}
              </Link>
            ) : (
              <span className="truncate text-sm font-bold text-text-main">
                {counterpart.name}
              </span>
            )}
            {counterpart.isVerified && (
              <VerifiedIcon
                size="md"
                label={t("ui.identityStatus.verification.identity")}
              />
            )}
            {counterpart.accountType === "pro" && (
              <ProBadge
                label={t("ui.identityStatus.pro.short")}
                accessibilityLabel={t("ui.identityStatus.pro.account")}
              />
            )}
          </div>

          <PresenceStatus presence={presence} lastSeen />
          {counterpart.awayUntil &&
            Date.parse(counterpart.awayUntil) > Date.now() && (
              <p
                className="text-micro font-semibold text-warning"
                data-conversation-away-notice
              >
                {t("messaging.away.notice", {
                  date: new Date(counterpart.awayUntil).toLocaleDateString(
                    locale,
                    { day: "numeric", month: "long" },
                  ),
                })}
                {counterpart.awayMessage ? ` — ${counterpart.awayMessage}` : ""}
              </p>
            )}
          <div className="flex items-center gap-2 text-micro text-text-tertiary font-medium">
            {counterpart.rating !== undefined && (
              <span className="flex items-center gap-0.5 text-warning font-bold">
                <Star className="w-icon-xs h-icon-xs fill-rating-fill text-rating-fill" />
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
            ) : null}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {/* Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-text-supporting hover:text-text-main rounded-xl hover:bg-surface-muted transition-colors"
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
              <div className="absolute right-0 top-full mt-1 w-52 bg-bg-surface rounded-xl shadow-lg border border-border-base p-1 z-dropdown space-y-0.5 text-xs font-semibold">
                {publicProfileUrl && (
                  <Link
                    to={publicProfileUrl}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-emphasis hover:bg-surface-muted transition-colors"
                  >
                    <ExternalLink className="w-icon-md h-icon-md text-text-inverse-subtle" />
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
                      : "text-text-emphasis hover:bg-surface-muted"
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
                      <UserX className="w-icon-md h-icon-md text-text-tertiary" />
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
