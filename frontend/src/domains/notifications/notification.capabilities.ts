/**
 * SHONGRE NOTIFICATION CAPABILITIES
 * Evaluates viewer permissions for reading, interacting, and managing notifications.
 */

import { UserProfile } from '../../types';
import { Notification } from './notification.types';

export interface NotificationCapabilities {
  canRead: boolean;
  canAct: boolean;
  canDismiss: boolean;
  canManagePreference: boolean;
}

export class NotificationCapabilitiesService {
  resolve(params: { viewer: UserProfile | null; notification?: Notification }): NotificationCapabilities {
    const { viewer, notification } = params;

    if (!viewer) {
      return {
        canRead: false,
        canAct: false,
        canDismiss: false,
        canManagePreference: false,
      };
    }

    const isRecipient = !notification || notification.recipientId === viewer.id;

    return {
      canRead: isRecipient,
      canAct: isRecipient && viewer.status !== 'suspended',
      canDismiss: isRecipient,
      canManagePreference: true,
    };
  }
}

export const notificationCapabilitiesService = new NotificationCapabilitiesService();
