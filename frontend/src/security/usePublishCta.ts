import { useMemo } from "react";
import { useAuthorization } from "./useAuthorization";
import { MessageKey } from "../i18n/messages.fr";
import { routes } from "../configuration/routes";
import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";

export interface PublishCta {
  /** Where the button should actually take this user. */
  to: string;
  /** Label matched to the destination, so the button never over-promises. */
  label: string;
  /** Short label for tight spots (mobile tab bar). */
  shortLabel: string;
}

/**
 * Message keys rather than literals.
 *
 * This hook lives in a `.ts` module with no component around it, so it cannot
 * call `useTranslation` — and because it fed the loudest control in the product
 * (primary in the header, the raised button in the mobile tab bar) it was the
 * most visible French string left in an otherwise English interface. It now
 * returns keys and the consuming component resolves them.
 */
export interface PublishCtaKeys {
  to: string;
  labelKey: MessageKey;
  shortLabelKey: MessageKey;
}

/**
 * Destination for the "Déposer une annonce" call to action.
 *
 * This is the loudest control in the product — primary in the header, and the
 * raised centre button in the mobile tab bar. It used to point at `/deposer`
 * unconditionally, so any visitor without `listing.create` (guests and buyers,
 * i.e. most of the audience) hit a permission wall instead of an action.
 *
 * Rather than hide the CTA — it is a genuine acquisition surface — send people
 * to the step that actually unblocks them, and label it for what it does.
 */
export function usePublishCta(): PublishCtaKeys {
  const { can, currentUser, accountType, isSuspended, isDeactivated } =
    useAuthorization();

  return useMemo(() => {
    if (isStaffSeparatedSubject(currentUser)) {
      const isActiveStaff = currentUser?.staffStatus === "active";
      return {
        to: isActiveStaff ? routes.admin.overview() : routes.contact(),
        labelKey: isActiveStaff
          ? "publishCta.internalConsole"
          : "footer.contactSupport",
        shortLabelKey: isActiveStaff
          ? "publishCta.internalConsoleShort"
          : "footer.contactSupport",
      };
    }

    if (isSuspended || isDeactivated) {
      return {
        to: "/compte",
        labelKey: isSuspended
          ? "publishCta.accountSuspended"
          : "publishCta.accountInactive",
        shortLabelKey: isSuspended
          ? "publishCta.suspendedShort"
          : "publishCta.inactiveShort",
      };
    }

    if (accountType === "professional") {
      if (can("auto.vehicle.manage.own")) {
        return {
          to: routes.auto.publish(),
          labelKey: "publishCta.postVehicle",
          shortLabelKey: "publishCta.postListingShort",
        };
      }
      if (can("immo.property.manage.own")) {
        return {
          to: routes.immo.publish(),
          labelKey: "publishCta.postProperty",
          shortLabelKey: "publishCta.postListingShort",
        };
      }
      if (can("employment.job.manage.own")) {
        return {
          to: routes.employment.publish(),
          labelKey: "publishCta.postJob",
          shortLabelKey: "publishCta.postListingShort",
        };
      }
      if (can("course.organization.manage.own")) {
        return {
          to: routes.courses.organization(),
          labelKey: "publishCta.manageCourses",
          shortLabelKey: "publishCta.manageShort",
        };
      }
    }

    if (can("listing.create")) {
      return {
        to: "/deposer",
        labelKey: "publishCta.postListing",
        shortLabelKey: "publishCta.postListingShort",
      };
    }

    // Signed in but not a seller: the missing piece is a seller account, not auth.
    if (currentUser) {
      return {
        to: "/inscription/particulier",
        labelKey: "publishCta.becomeSeller",
        shortLabelKey: "publishCta.becomeSellerShort",
      };
    }

    // Guest: "Déposer une annonce" leads them to the publish flow where auth/account is created.
    return {
      to: "/deposer",
      labelKey: "publishCta.postListing",
      shortLabelKey: "publishCta.postListingShort",
    };
  }, [accountType, can, currentUser, isSuspended, isDeactivated]);
}
