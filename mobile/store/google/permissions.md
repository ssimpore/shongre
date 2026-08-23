# Google Play permissions

Active generated permissions are Internet, notifications, vibration, and legacy read/write external storage capped at API 32 for the image picker. Android 13+ uses the system picker. Camera, all location access, contacts, microphone, and system overlay permissions are blocked with manifest removal rules.

No location service is enabled. Test API 24, 32, 33, 36 and current devices for request timing, denial, “don’t ask again,” selected-media behavior, and settings recovery. Reconcile the signed AAB merged manifest; dependency manifests can change after source review.
