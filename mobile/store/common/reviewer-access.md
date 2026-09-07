# Reviewer access

Reviewers need access to browsing/search, listing details, authentication, publication, messages, report/block, notification settings, and account deletion. The mobile binary is API-only and review must use a stable, isolated staging backend with controlled test data and a non-expiring test account; there is no local sample-data fallback. Put credentials only in the secure review fields of App Store Connect and Play Console—never in this repository or screenshots.

Recommended review scenario:

1. Browse and search without signing in.
2. Sign in with the dedicated reviewer account.
3. Open a seeded listing, contact its seller, then exercise report and block controls.
4. Create a draft listing and demonstrate the contextual photo-library prompt; cancellation must preserve a usable path and location remains manually editable.
5. Open notification settings and explain the benefit before the OS prompt.
6. Open account deletion; use a separate disposable reviewer account if the reviewer must complete deletion.

Provide notes for any feature flag, market restriction, sandbox payment, KYC, or active-order guard. Before submission, have someone outside the team follow the notes on a clean device and verify the account is not rate-limited, expired, or dependent on an internal network.
