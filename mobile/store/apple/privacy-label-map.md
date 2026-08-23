# Apple App Privacy label map

Candidate declarations based on current API-mode behavior; the privacy owner must validate them in App Store Connect against production before submission.

| Apple category                                               | Collected                            | Linked             | Tracking | Purpose / evidence                                              |
| ------------------------------------------------------------ | ------------------------------------ | ------------------ | -------- | --------------------------------------------------------------- |
| Contact Info: email, name, phone/address when provided       | Yes                                  | Yes                | No       | Account, seller profile, transaction/support                    |
| Identifiers: user ID, device/push token                      | Yes                                  | Yes                | No       | Authentication and app notifications                            |
| User Content: listing photos/text, messages, reports/support | Yes                                  | Yes                | No       | Marketplace, communication, safety                              |
| Purchases / financial info                                   | When transactional features are used | Yes                | No       | Physical marketplace transaction; raw cards stay with processor |
| Search/browsing activity                                     | Potentially in API mode              | Yes when signed in | No       | Search, favorites, product operation                            |
| Diagnostics                                                  | No Shongre crash SDK today           | N/A                | No       | Re-evaluate release archive and hosting logs                    |
| Camera, contacts, device location, sensitive info, audio     | No                                   | N/A                | No       | Permissions absent/blocked                                      |

The generated `PrivacyInfo.xcprivacy` declares email, user ID, photos/videos, and other user content for app functionality, tracking false, and UserDefaults reason CA92.1. A manifest is not a substitute for App Privacy answers. Update both if orders/payments, analytics, crash reporting, AI, social login, ads, location, or new SDKs ship.
