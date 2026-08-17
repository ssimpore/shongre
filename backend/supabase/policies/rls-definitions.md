# Shongre Row-Level Security (RLS) Architecture & Policy Catalog

This document defines the authoritative Row-Level Security (RLS) specifications and authorization matrix for all PostgreSQL tables in the Shongre platform.

---

## 1. Security Philosophy
1. **Deny-by-Default**: Every table has `ROW LEVEL SECURITY` enabled.
2. **Strict Multi-Tenant Isolation**: Users cannot read or modify another user's drafts, private messages, KYC documents, or order details unless authorized.
3. **Escrow & Financial Segregation**: Payouts and Escrow release routines are strictly protected with `SECURITY DEFINER` stored procedures.
4. **Market & Role Boundaries**: Admins and Moderators have scoped privileged access with audit logging.

---

## 2. Table-by-Table Policy Catalog

| Table | Operations | Permitted Roles | Policy Rule |
| :--- | :--- | :--- | :--- |
| `profiles` | SELECT | `public` | `status != 'banned' OR is_moderator_or_admin()` |
| `profiles` | UPDATE | `owner`, `admin` | `auth_user_id = auth_uid() OR is_admin()` |
| `listings` | SELECT | `public` | `status = 'published' OR seller_id = auth_uid() OR is_moderator_or_admin()` |
| `listings` | INSERT / UPDATE / DELETE | `seller`, `admin` | `seller_id = auth_uid() OR is_admin()` |
| `conversations` | SELECT | `buyer`, `seller`, `staff` | `buyer_id = auth_uid() OR seller_id = auth_uid() OR is_moderator_or_admin()` |
| `messages` | INSERT | `conversation_participant` | Sender must be buyer or seller in the target conversation |
| `orders` | SELECT | `buyer`, `seller`, `admin` | `buyer_id = auth_uid() OR seller_id = auth_uid() OR is_admin()` |
| `payouts` | SELECT | `seller`, `admin` | `seller_id = auth_uid() OR is_admin()` |
| `verification_requests` | SELECT / INSERT | `owner`, `admin` | `user_id = auth_uid() OR is_admin()` |
| `fraud_risk_scores` | ALL | `admin` | `is_admin()` only |
| `audit_logs` | SELECT | `admin` | `is_admin()` only |
| `reviews` | SELECT | `public` | Viewable by all |
| `reviews` | INSERT | `authenticated` | `author_id = auth_uid()` |
| `reports` | INSERT | `authenticated` | `reporter_id = auth_uid()` |
| `reports` | SELECT / UPDATE | `staff` | `is_moderator_or_admin()` |
