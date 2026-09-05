import { breakpoints } from "@shongre/design-tokens";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, MessageSquare } from "lucide-react";
import { Button, Container } from "../../../design-system";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useTranslation } from "../../../i18n/I18nProvider";

export const PROPERTY_LEAD_FORM_ID = "immo-property-lead-form";

type PropertyPrimaryActionPhase = "lead" | "appointment";

interface PropertyPrimaryActionButtonProps {
  phase: PropertyPrimaryActionPhase;
  isSending: boolean;
  placement: "panel" | "sticky";
  onRequestVisit: () => void;
}

/**
 * Keeps the in-page and compact-header actions on one behavioral contract.
 * The lead phase submits the one canonical form by id, so native validation,
 * authorization interception, analytics metadata, loading, errors and success
 * state are identical no matter which visible CTA initiates the request.
 */
export function PropertyPrimaryActionButton({
  phase,
  isSending,
  placement,
  onRequestVisit,
}: PropertyPrimaryActionButtonProps) {
  const { t } = useTranslation();
  const fullWidth = placement === "panel";
  const size = placement === "sticky" ? "compact" : "md";

  if (phase === "appointment") {
    return (
      <Button
        data-marketplace-action="appointment.request"
        variant="primary"
        size={size}
        fullWidth={fullWidth}
        onClick={onRequestVisit}
        leftIcon={<CalendarDays className="h-icon-md w-icon-md" />}
      >
        {t("immo.propertyDetail.requestAppointment")}
      </Button>
    );
  }

  return (
    <Button
      data-marketplace-action="message.send"
      form={PROPERTY_LEAD_FORM_ID}
      type="submit"
      variant="primary"
      size={size}
      fullWidth={fullWidth}
      isLoading={isSending}
      leftIcon={<MessageSquare className="h-icon-md w-icon-md" />}
    >
      {t("immo.propertyDetail.sendRequest")}
    </Button>
  );
}

interface PropertyStickyHeaderProps {
  originalHeaderRef: RefObject<HTMLDivElement | null>;
  eyebrow: string;
  title: string;
  price: string;
  phase: PropertyPrimaryActionPhase;
  isSending: boolean;
  onRequestVisit: () => void;
}

const ENVIRONMENT_HEADER_STACK_SELECTOR =
  '[data-environment-header-stack="true"]';

/**
 * A desktop-only replacement for the listing summary once that summary has
 * fully passed behind the persistent application chrome. The portal anchors
 * the bar to the chrome's real lower edge without a guessed header height, and
 * its absolute positioning keeps it out of document flow to prevent layout
 * shift during entry and exit.
 */
export function PropertyStickyHeader({
  originalHeaderRef,
  eyebrow,
  title,
  price,
  phase,
  isSending,
  onRequestVisit,
}: PropertyStickyHeaderProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.lg})`);
  const [headerStackRoot, setHeaderStackRoot] = useState<HTMLElement | null>(
    null,
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setHeaderStackRoot(
      document.querySelector<HTMLElement>(ENVIRONMENT_HEADER_STACK_SELECTOR),
    );
  }, []);

  useEffect(() => {
    setIsVisible(false);
    const originalHeader = originalHeaderRef.current;
    if (!isDesktop || !originalHeader || !headerStackRoot) return;

    let intersectionObserver: IntersectionObserver | undefined;
    const observeAtCurrentChromeHeight = () => {
      intersectionObserver?.disconnect();
      const chromeHeight = headerStackRoot.getBoundingClientRect().height;
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(
            !entry.isIntersecting &&
              entry.boundingClientRect.bottom <=
                headerStackRoot.getBoundingClientRect().bottom,
          );
        },
        {
          rootMargin: `-${Math.ceil(chromeHeight)}px 0px 0px 0px`,
          threshold: 0,
        },
      );
      intersectionObserver.observe(originalHeader);
    };

    observeAtCurrentChromeHeight();
    const resizeObserver = new ResizeObserver(observeAtCurrentChromeHeight);
    resizeObserver.observe(headerStackRoot);

    return () => {
      intersectionObserver?.disconnect();
      resizeObserver.disconnect();
    };
  }, [headerStackRoot, isDesktop, originalHeaderRef]);

  if (!headerStackRoot) return null;

  return createPortal(
    <aside
      data-testid="immo-desktop-sticky-header"
      data-state={isVisible ? "visible" : "hidden"}
      aria-label={t("immo.propertyDetail.stickyHeaderLabel")}
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={`absolute inset-x-0 top-full hidden border-b border-border-base bg-bg-surface/95 shadow-sticky backdrop-blur-md motion-surface lg:block motion-reduce:transition-none ${
        isVisible
          ? "visible translate-y-0 opacity-100"
          : "invisible pointer-events-none -translate-y-full opacity-0"
      }`}
    >
      <Container>
        <div className="flex min-w-0 items-center gap-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-micro font-bold uppercase tracking-wide text-primary">
              {eyebrow}
            </p>
            <p className="truncate text-sm font-bold text-text-main">{title}</p>
          </div>
          <p className="shrink-0 text-base font-bold text-primary">{price}</p>
          <div className="shrink-0">
            <PropertyPrimaryActionButton
              phase={phase}
              isSending={isSending}
              placement="sticky"
              onRequestVisit={onRequestVisit}
            />
          </div>
        </div>
      </Container>
    </aside>,
    headerStackRoot,
  );
}
