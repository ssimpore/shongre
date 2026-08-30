# Shongre Row-Level Security (RLS) Architecture & Policy Catalog

This document defines the authoritative Row-Level Security (RLS) specifications and authorization matrix for all PostgreSQL tables in the Shongre platform.

---

## 1. Security Philosophy

1. **Deny-by-Default**: Every table has `ROW LEVEL SECURITY` enabled.
2. **Strict Multi-Tenant Isolation**: Users cannot read or modify another user's drafts, private messages, KYC documents, or order details unless authorized.
3. **Escrow & Financial Segregation**: Payouts and Escrow release routines are strictly protected with `SECURITY DEFINER` stored procedures.
4. **Market & Capability Boundaries**: Internal access uses exact capabilities
   through backend services; a Staff label is never a broad table bypass.
5. **Staff/Customer Separation**: Any retained `staff_memberships` row makes
   `is_customer_marketplace_actor()` false. Restrictive policies then intersect
   all existing customer policies and deny direct Staff access in every Staff
   lifecycle state.

---

## 2. Table-by-Table Policy Catalog

| Table                   | Operations               | Permitted Roles            | Policy Rule                                                                                |
| :---------------------- | :----------------------- | :------------------------- | :----------------------------------------------------------------------------------------- |
| `public_profiles`       | SELECT                   | `anon`, customer           | active non-Staff privacy-safe projection; Staff actor receives no rows                     |
| `profiles`              | UPDATE                   | customer owner             | safe-column policy intersected with Staff customer-update denial                           |
| `listings`              | SELECT                   | `anon`, customer           | published/owned policy intersected with Staff separation                                   |
| `listings`              | INSERT / UPDATE / DELETE | customer owner             | ownership policy, customer capability, Staff separation, and Staff-owner lifecycle trigger |
| `conversations`         | SELECT                   | customer participant       | participant policy intersected with Staff separation                                       |
| `messages`              | INSERT                   | `conversation_participant` | Sender must be buyer or seller in the target conversation                                  |
| `orders`                | SELECT                   | customer participant       | buyer/seller policy intersected with Staff separation                                      |
| `payouts`               | SELECT                   | customer owner             | seller policy intersected with Staff separation                                            |
| `verification_requests` | SELECT / INSERT          | customer owner             | owner policy intersected with Staff separation                                             |
| `fraud_risk_scores`     | ALL                      | backend service role       | exact compliance/fraud service authorization; never a broad Staff policy                   |
| `audit_logs`            | SELECT                   | backend service role       | exact `audit.read` route and market scope                                                  |
| `reviews`               | SELECT                   | `public`                   | Viewable by all                                                                            |
| `reviews`               | INSERT                   | `authenticated`            | `author_id = auth_uid()`                                                                   |
| `reports`               | INSERT                   | `authenticated`            | `reporter_id = auth_uid()`                                                                 |
| `reports`               | SELECT / UPDATE          | backend service role       | exact report/moderation capability through the backend                                     |

Migration `00083_staff_marketplace_separation.sql` applies the restrictive
Staff predicate to customer-owned marketplace, vertical, monetization,
finance, invoicing, CRM, and marketing tables without creating any new grant.
It also strips forbidden direct grants, prevents Staff-role grant bridges,
revokes sessions, retires Staff inventory, and blocks future Staff listing
ownership. Anonymous public discovery and service-role internal operations keep
their existing behavior.
