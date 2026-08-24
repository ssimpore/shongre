# Progressive compliance architecture

Status: implemented baseline, 24 August 2026  
Owner: Security / Compliance / Marketplace Architecture  
Legal caveat: this document maps the product and the current primary sources; it is not a substitute for counsel. Every unresolved point is marked `LEGAL_REVIEW_REQUIRED` and remains configurable.

## Outcome

Shongre now evaluates the action a person is trying to perform and asks only for the minimum missing verification attached to that action. A verification dimension is not a role and there is no global “KYC complete” permission.

```text
requested action
  → CompliancePolicyEngine(context, active versioned rules)
  → independent verification records
  → allow, or return the minimum missing checks
  → hosted provider / structured registry / manual review
  → re-evaluate
  → resume returnTo
```

Coarse access control still answers “may this role attempt this operation?”. Compliance answers “is this subject sufficiently verified for this operation and context?”. Risk only contributes proportionate step-up signals; it does not manufacture a legal obligation.

## Existing implementation audit

Before this change Shongre had useful foundations—email/phone flags, identity and business workflows, a provider container, signed Stripe webhooks, staff capabilities, deterministic demo personas, a verification center, and a verification repository—but the controls were not a coherent compliance domain:

- the frontend assigned fixed trust tiers and a 0–100 “trust score”;
- phone/identity gates and value thresholds were hardcoded in UI logic;
- `isVerified`, `isIdentityVerified`, and `isBusinessVerified` could be interpreted as one global trust state;
- document URLs, dates of birth, document numbers, IBANs and BICs could be stored in ordinary demo profiles or `verification_requests`;
- submitting an IBAN immediately produced a verified payout state;
- payout accepted its destination from the request body;
- manual review displayed sensitive identity and banking values and did not require a structured reason for approvals;
- DAC7, DSA trader traceability, PSP onboarding, fraud step-up and KYB were not separately modeled.

The legacy booleans remain only as compatibility projections. Migration `00031_progressive_compliance.sql` maps existing positive states without forcing users through KYC at login. New decisions and provider events use the compliance tables.

## Actual Shongre flows and legal perimeter

The code supports more than classified advertising: direct purchases, reservations, service/course bookings, deposits, commissions, payment intents, seller balances, payouts, professional stores, real-estate and employment verticals. Legal applicability therefore varies by configured flow.

| Product flow                                | Current technical shape                                                                         | Compliance treatment                                                                                                                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public browse/search/profile                | Public content, no account needed                                                               | No KYC. GDPR minimisation applies.                                                                                                                                                                                                                       |
| Account/favorite/message                    | Marketplace account and messaging                                                               | Email is enough by default; phone is recommended or risk step-up.                                                                                                                                                                                        |
| Contact-only private classified             | Shongre publishes an offer; conclusion/payment can remain off-platform                          | Email + seller classification. Government ID is not a baseline publication requirement.                                                                                                                                                                  |
| Professional publication                    | Trader promotes/offers goods or services                                                        | Business, representative authority, and public trader status are separate dimensions. DSA Article 30 applies where Shongre allows the consumer to conclude a distance contract; classification of each contact-only vertical is `LEGAL_REVIEW_REQUIRED`. |
| Reservation / direct purchase / booking     | Platform records a transaction or booking                                                       | Contract-conclusion, consumer and tax analysis is feature-specific. The policy receives `transactionType` and `contractConclusionMode`.                                                                                                                  |
| PSP redirect / marketplace payment          | Provider account and hosted onboarding                                                          | Payment KYC/KYB belongs to the regulated PSP. Shongre stores status/reference only.                                                                                                                                                                      |
| Seller payout                               | Provider-held destination                                                                       | Only `receivePayout` is blocked. Publishing and messaging remain independent.                                                                                                                                                                            |
| Platform receiving third-party funds itself | Legacy code names escrow, but the final production fund flow is not evidenced by the repository | `LEGAL_REVIEW_REQUIRED`. Production must use a regulated PSP/agent structure or obtain the required status; no internal wallet is authorised by this design.                                                                                             |
| DAC7/DPI activity                           | Shongre may know transactions/consideration for direct purchases and bookings                   | Separate DAC7 aggregate and tax profile. Applicability is evaluated; thresholds are not UI constants.                                                                                                                                                    |

### DSA

Article 30 of the [Digital Services Act](https://eur-lex.europa.eu/eli/reg/2022/2065/oj) concerns providers of online platforms allowing consumers to conclude distance contracts with traders. It requires specified trader information, best efforts to assess reliability, secure retention during the relationship and six months afterwards, and public display of only the defined subset. Shongre therefore separates private verification records from public trader disclosure. Whether a contact-only classified vertical “allows” conclusion through Shongre depends on its contractual and interaction design and is `LEGAL_REVIEW_REQUIRED`; direct platform checkout is treated as the stronger applicability case.

### DAC7 / French DPI

[Directive (EU) 2021/514](https://eur-lex.europa.eu/eli/dir/2021/514/oj) and the French [BOFiP scope guidance](https://bofip.impots.gouv.fr/bofip/13729-PGP.html/identifiant=BOI-INT-AEA-30-10-20230111) cover defined relevant activities and depend on what the platform facilitates and what consideration is known or reasonably knowable. The directive’s seller exclusion for sale of goods combines an activity-count and consideration test; it is not a generic “tax verification level”. Those values are legal-rule data, never component constants. The architecture records yearly activity aggregates and exposes `LEGAL_REVIEW_REQUIRED` until operator, activity, seller and exclusion applicability are confirmed. Collection/verification timing follows the configured reporting rule, not signup.

### Payments / AML-CFT

The ACPR states that professionally providing payment services is reserved to authorised PSPs and explains the regulatory issue when a business [collects funds and transfers them to a third party](https://acpr.banque-france.fr/fr/professionnels/lacpr-vous-accompagne/parcours-fintech/contenus-pedagogiques/de-quel-statut-releve-mon-activite/jencaisse-des-fonds-et-les-reverse-une-tierce-personne). The production target is PSP marketplace accounts and provider-held payout destinations. Shongre does not infer that all users are subject to AML/CFT customer due diligence merely because the product is a marketplace; PSP requirements are returned through `PaymentComplianceProvider`. The final contractual fund flow, agent status, safeguarding, refunds and chargeback responsibility are `LEGAL_REVIEW_REQUIRED` before live payments.

### GDPR, French data protection and DPIA

The design follows purpose limitation, minimisation and storage limitation under the [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj). The CNIL explains that data must be limited to what is necessary and should be automatically deleted or anonymised when no longer required ([minimisation guidance](https://www.cnil.fr/fr/minimiser-les-donnees-collectees)); retention must be defined by purpose rather than indefinite ([retention guidance](https://cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees)). A DPIA is required where the resulting processing is likely to create high risk, and must assess necessity, proportionality and security ([CNIL DPIA guidance](https://www.cnil.fr/fr/definition/analyse-dimpact-aipd)). Hosted identity checks, fraud signals, cross-provider references, material automated restrictions and any biometric/liveness provider configuration require a DPIA decision before production. This is `LEGAL_REVIEW_REQUIRED` until the chosen providers and final purposes are known.

### Business and electronic identification

French business verification should prefer structured official registry data. The INPI describes the RNE and its [official API access](https://www.inpi.fr/ressources/formalites-dentreprises/acces-lapi-formalite-rne). Electronic identification can satisfy specific DSA traceability paths where appropriate, but eIDAS does not make a government eID mandatory for every Shongre account. VIES/RNE/SIRENE validation, representative authority and PSP KYC are independent results.

### Other frameworks

- Consumer information, trader status, product safety and prohibited-category rules attach to the relevant professional offer/vertical, not to every visitor.
- Age is a separate dimension and is activated only for a service/category with a confirmed age rule. Current generic classifieds have no baseline age-document rule.
- Sanctions screening and AML/CFT are provider/jurisdiction/action policies when legally applicable. No generic sanctions check is enabled in the baseline.
- Employment, education, vehicles and real estate can each schedule specialised rules. Their exact French and expansion-market requirements remain `LEGAL_REVIEW_REQUIRED` until the service terms and transaction model are approved.

## Canonical model

Public types live in `@shongre/contracts/compliance`:

- independent dimensions: email, phone, identity, age, address, business, representative, beneficial owner, tax, VAT, bank account, payment, payout, professional status, risk, enhanced review and MFA;
- states: not required, required, pending, processing, verified, failed, expired, needs update, manual review and rejected;
- action and capability vocabulary;
- evaluation input, requirement decision, versioned rule, manual review, retention, visibility and audit contracts.

`CompliancePolicyEngine` is pure and deterministic. `ComplianceService` owns repositories, providers, state transitions and decision audit. `RiskEngine` returns a level, reason codes and review recommendation but cannot verify a user or permanently ban an account.

## Rule governance

Each rule has jurisdiction, regulation, action, conditions, required/recommended checks, reason codes, legal bases, primary source references, governance class, version, status, effective range and priority.

- `LEGAL_MANDATE`: requires reviewed source and effective date.
- `BUSINESS_POLICY`: proportionate operational requirement.
- `RISK_CONTROL`: fraud/safety step-up, kept distinct from legal basis.
- `LEGAL_REVIEW_REQUIRED`: visible but not silently promoted into a blocking legal rule.

Database rules replace bootstrap rules by stable ID. Change history, reviewer, reason and scheduled effective dates are retained. Only `compliance.policy.manage` can mutate them; an ordinary administrator does not receive sensitive-record access.

## Security and privacy boundaries

- Browser clients can request a decision or start a session; they cannot submit `verified` state.
- Provider webhooks use a timestamped HMAC over raw bytes, a five-minute window and a unique provider event ID.
- Webhook payloads are not stored; only event ID and SHA-256 payload hash are retained for replay protection.
- General compliance records contain no raw image, TIN, IBAN, BIC, date of birth or provider payload.
- Tax identifiers have a separate ciphertext boundary and no browser grants. Key management and decryption service are deployment work, not database-column logic.
- Audit events are immutable and exclude sensitive values.
- Legacy `verification_requests` is quarantined from browser roles and has a retention policy requiring legal review before purge/migration.
- The owner can see understandable status; public visibility is a separate projection. Internal risk reasons and private verification details are never public badges.

## Retention and data-subject rights

Retention policies are explicit records with purpose, basis, active/archive periods, terminal action, visibility, version and review state. `run_approved_compliance_retention` is a service-role-only execution boundary with immutable run history: it currently deletes expired processed webhook-deduplication records, and skips every policy still carrying `LEGAL_REVIEW_REQUIRED`. Additional deletion, anonymisation or restricted-archive handlers must be added only after their periods and terminal actions are approved. Production still needs to schedule the routine.

Access, rectification, restriction, objection, portability and erasure workflows must query the compliance domain. Erasure can be refused or delayed for a documented legal obligation; the response must identify the retained class and basis. Provider-side deletion/export obligations belong in provider contracts and runbooks.

## User experience

- Verification Center removes the global trust score and maximum-tier ladder.
- It displays only relevant or already-started dimensions.
- `action` and safe relative `returnTo` parameters preserve the original journey.
- Publishing evaluates publication and, only if selected, online-payment capability.
- Pending payment/identity checks restrict only dependent capabilities.
- Identity and payout dialogs explain why, what, processor and consequence, then open the hosted provider.
- Failures retain an actionable retry/manual-review path.

## Deployment gates

Before live KYC/payments/DAC7 reporting:

1. approve the legal applicability matrix and final terms for every transaction mode;
2. complete the DPIA decision and processor/transfer assessment;
3. select regulated PSP and identity/business providers, verify contracts and retention;
4. configure field-level encryption/key rotation for tax data;
5. approve unresolved retention periods, add their reviewed handlers and schedule the retention routine;
6. backfill or purge quarantined legacy verification data under a reviewed plan;
7. test provider webhook rotation, replay, outage and appeal paths;
8. complete RLS tests with real Supabase identities and service-role separation;
9. validate public trader disclosure per vertical without exposing private KYC data;
10. obtain legal sign-off for every `LEGAL_REVIEW_REQUIRED` rule before making it blocking.
