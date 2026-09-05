# iOS and iPadOS assets

Copy `AppIcon.appiconset` into the Xcode asset catalog (`Assets.xcassets`). The
set contains iPhone, iPad, and App Store PNGs plus a complete `Contents.json`.

The primary icon is opaque and square. Do not bake rounded corners or a drop
shadow into the files; Apple applies the platform mask. Dark and tinted 1024 px
alternatives are included as starting points under `alternates/`. Check their
appearance on every supported OS version before submission.
