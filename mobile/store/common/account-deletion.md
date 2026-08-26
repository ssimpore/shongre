# Account deletion

Signed-in users can open Settings → Delete account. The flow explains consequences, requires the current password, and calls `POST /api/v1/account/delete`. The backend rejects deletion while active orders require fulfillment, creates an auditable request, anonymizes the profile, removes credentials and push tokens, and invalidates future login. It preserves only records required for transactions, fraud, disputes, safety, accounting, or law; retention details must be finalized in the public policy.

The public, login-optional web entry is built from `${PUBLIC_INTL_URL}` plus `/account/delete`. A signed-out visitor can reach sign-in or support. The same operation is exposed through `AuthService`, not duplicated in the UI.

Before release, verify production reauthentication, multi-provider revocation (including Sign in with Apple if later added), retry/idempotency, pending-deletion communications, statutory retention wording, deployed public route, and deletion of every processor copy allowed by law.
