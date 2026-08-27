import {
  StatePanel as SharedStatePanel,
  type StatePanelProps as SharedStatePanelProps,
  type StatePanelVariant,
} from "@shongre/ui/web";
import { useTranslation } from "../../i18n/I18nProvider";

export type { StatePanelVariant };
export type StatePanelProps = Omit<
  SharedStatePanelProps,
  "technicalDetailLabel"
>;

/**
 * Whole-view state for a page that cannot show its normal content: the resource
 * is missing, the request failed, or the user lacks access.
 *
 * Distinct from `EmptyState`, which is for a collection that is legitimately
 * empty. Every state rendered here carries a way forward — pages previously
 * hand-rolled "Boutique introuvable" / "Contact introuvable" dead ends with
 * different markup and no next step.
 */
export function StatePanel(props: StatePanelProps) {
  const { t } = useTranslation();
  return (
    <SharedStatePanel
      {...props}
      technicalDetailLabel={t("ui.statePanel.detailsTechniques")}
    />
  );
}
