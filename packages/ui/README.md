# @shongre/ui

Canonical Shongre UI primitives with one public design language and explicit
Web/native renderers. Web uses semantic HTML; native uses React Native controls.
Application packages compose these primitives but do not redefine them.

Web feedback ownership includes `Modal`, bottom/right `Drawer`, and
`StatePanel`; application adapters may inject localized labels but must not
fork their structure, focus behavior, state tones, spacing, or motion.
