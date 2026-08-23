# Permissions inventory

| Permission                                                                           | Platform           | User-visible reason                       | Request point                 | Fallback                                       | Status                                            |
| ------------------------------------------------------------------------------------ | ------------------ | ----------------------------------------- | ----------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Selected photo library / legacy media access ≤ API 32                                | iOS/Android        | Choose listing images                     | Explicit photo action         | Continue without a photo                       | Declared; Android legacy storage capped at API 32 |
| Notifications                                                                        | iOS/Android        | Listing/message/order updates             | Explained notification opt-in | In-app notification center                     | Declared                                          |
| Internet, vibration                                                                  | Android            | Network product and notification feedback | System/runtime                | N/A                                            | Normal capability                                 |
| Camera, Face ID, microphone, contacts, location, motion, overlay, background service | Both as applicable | No current reachable product need         | Never                         | Manual listing location and photo-library path | Explicitly absent/blocked                         |

Evidence: `mobile/app.config.ts`, generated `mobile/ios/Shongre/Info.plist`, and generated `mobile/android/app/src/main/AndroidManifest.xml`. Run `make permissions-check` after every dependency or plugin change.
