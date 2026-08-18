import { useMemo } from 'react';
import { useAuthorization } from './useAuthorization';

export interface PublishCta {
  /** Where the button should actually take this user. */
  to: string;
  /** Label matched to the destination, so the button never over-promises. */
  label: string;
  /** Short label for tight spots (mobile tab bar). */
  shortLabel: string;
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
export function usePublishCta(): PublishCta {
  const { can, currentUser, isSuspended, isDeactivated } = useAuthorization();

  return useMemo(() => {
    if (isSuspended || isDeactivated) {
      return {
        to: '/compte',
        label: isSuspended ? 'Compte suspendu' : 'Compte inactif',
        shortLabel: isSuspended ? 'Suspendu' : 'Inactif',
      };
    }

    if (can('listing.create')) {
      return {
        to: '/deposer',
        label: 'Déposer une annonce',
        shortLabel: 'Déposer',
      };
    }

    // Signed in but not a seller: the missing piece is a seller account, not auth.
    if (currentUser) {
      return {
        to: '/inscription/particulier',
        label: 'Devenir vendeur',
        shortLabel: 'Vendre',
      };
    }

    // Guest: "Déposer une annonce" leads them to the publish flow where auth/account is created.
    return {
      to: '/deposer',
      label: 'Déposer une annonce',
      shortLabel: 'Déposer',
    };
  }, [can, currentUser, isSuspended, isDeactivated]);
}
