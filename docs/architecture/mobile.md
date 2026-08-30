# Mobile architecture

`mobile/` is the single Expo + React Native product source for iOS and Android. Expo Router routes live in `mobile/app/`; reusable product logic lives in `mobile/src/`; generated native projects live in `mobile/ios/` and `mobile/android/`. Native code is only for configuration or a capability that cannot be expressed through supported Expo configuration.

The mobile UI consumes typed services. `EXPO_PUBLIC_DATA_MODE=demo` selects deterministic, asynchronous adapters and requires no backend. `api` selects HTTP adapters using `EXPO_PUBLIC_API_URL`. Components do not branch on data mode and never import backend implementation. Cross-client DTO primitives that are genuinely stable live in `packages/contracts/`.

Connected services accept only paths generated from the sole OpenAPI contract
at `backend/openapi/openapi.json`. Mobile does not maintain an endpoint registry
or a separate API specification; adapters import `ApiPath` from
`@shongre/contracts/openapi` and map transport data to native view models.

Authentication tokens use `expo-secure-store`; web fallback is process memory, never localStorage. Permissions are requested from the feature that needs them. Selected photos and notifications are the only declared user-facing mobile permissions. Camera, location, motion, microphone, contacts, and overlay permissions are blocked because no reachable feature needs them.

Expo config is environment-driven through `mobile/app.config.ts`. Run `make mobile-prebuild-clean` after native configuration changes and review generated manifests before release.

The stable Expo SDK does not yet generate the iOS scene lifecycle required by
the current Apple SDK. `mobile/plugins/with-ios-scene-lifecycle.cjs` backports
Expo's upstream scene-owned window bootstrap, lifecycle subscriber forwarding,
and cold/warm deep-link forwarding during prebuild. Remove this compatibility
plugin only after a stable Expo-generated project provides the same behavior and
passes clean-prebuild, simulator-launch, and link-routing verification.

For a local unsigned iOS Release verification, run `pod install` in `mobile/ios`
and invoke `xcodebuild` from a Bash process that first sources
`../../scripts/env.sh` and exports `NODE_ENV=production`. The exact command is
documented in the repository README. Do not source the Bash loader directly
from zsh: Expo's Xcode phases would miss the required identifiers and URLs.
Unsigned simulator verification covers Release compilation and packaging only;
signing, archive inspection, and device behavior remain separate release gates.
