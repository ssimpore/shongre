/**
 * SHONGRE AUTHORITATIVE PROVIDER REGISTRY
 * Static definition catalog describing all external integrations,
 * supported capabilities, configuration schemas, documentation links, and market scope.
 */

import {
  getProviderOperationalDefinition,
  type ProviderAdapterStatus,
} from "@shongre/contracts/provider-platform";
import { Provider } from "./provider.types";

const PROVIDER_PRESENTATION_REGISTRY: Array<Omit<Provider, "operational">> = [
  // 1. MangoPay marketplace candidate (no production runtime adapter)
  {
    id: "mangopay",
    code: "MANGOPAY_CANDIDATE",
    name: "MANGOPAY (candidat marketplace)",
    category: "PAYMENT",
    capabilities: [
      "payment.card",
      "payment.wallet",
      "payment.sepa",
      "payment.escrow",
      "payment.refund",
      "payout.transfer",
      "payout.instant",
    ],
    supportedMarkets: ["FR", "BE", "CH", "ES", "LU", "DE"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "clientId",
          label: "Identifiant Client MangoPay (Client ID)",
          type: "text",
          placeholder: "shongre_production_live",
          required: true,
        },
        {
          key: "apiKey",
          label: "Clé API MangoPay (Passphrase)",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "walletIdPlatform",
          label: "Identifiant du portefeuille plateforme (candidat)",
          type: "text",
          placeholder: "wlt_candidate_platform",
          required: true,
        },
        {
          key: "enable3DSecureV2",
          label: "Exiger 3D Secure v2 pour tous les paiements",
          type: "boolean",
          defaultValue: true,
        },
        {
          key: "sandboxMode",
          label: "Mode Sandbox / Test",
          type: "boolean",
          defaultValue: false,
        },
      ],
    },
    metadata: {
      website: "https://mangopay.com",
      documentationUrl: "https://docs.mangopay.com",
      documentationLabel: "Documentation API MangoPay",
      companyName: "MangoPay SA (Crédit Mutuel Arkéa)",
      headquartersCountry: "Luxembourg (UE)",
      complianceNotes:
        "Agréé Établissement de Monnaie Électronique (EME) par la CSSF sous le numéro 3812.",
    },
  },

  // 2. Stripe Connect & Card Payments
  {
    id: "stripe",
    code: "STRIPE_CONNECT",
    name: "Stripe Checkout / Billing",
    category: "PAYMENT",
    capabilities: [
      "payment.card",
      "payment.wallet",
      "payment.refund",
      "payment.marketplace",
      "payment.subscription",
      "payout.transfer",
      "verification.payment",
      "invoicing.subscription",
    ],
    supportedMarkets: ["FR", "BE", "CH", "ES", "LU", "DE"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "publishableKey",
          label: "Clé Publique Stripe (Publishable Key)",
          type: "text",
          placeholder: "pk_live_51Pxxxxxxxxxxxxxxxx",
          required: true,
        },
        {
          key: "secretKey",
          label: "Clé Secrète Stripe (Secret Key)",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "webhookSecret",
          label: "Secret Webhook Stripe (Signing Secret)",
          type: "password",
          placeholder: "whsec_••••••••••••",
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://stripe.com",
      documentationUrl: "https://stripe.com/docs",
      documentationLabel: "Documentation Stripe",
      companyName: "Stripe Payments Europe Ltd.",
      headquartersCountry: "Irlande (UE)",
    },
  },

  // 3. Mondial Relay
  {
    id: "mondial_relay",
    code: "MONDIAL_RELAY",
    name: "Mondial Relay (Points Relais & Lockers 24/7)",
    category: "DELIVERY",
    capabilities: [
      "delivery.relay_point",
      "delivery.quote",
      "delivery.tracking",
      "delivery.label",
    ],
    supportedMarkets: ["FR", "BE", "ES", "LU"],
    supportedCurrencies: ["EUR"],
    supportedLocales: ["fr-FR", "es-ES"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "enseigneCode",
          label: "Code Enseigne Mondial Relay",
          type: "text",
          placeholder: "BDTEST13",
          required: true,
        },
        {
          key: "privateKey",
          label: "Clé Privée de Sécurité / API Key",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "defaultWeightGrams",
          label: "Poids par défaut du colis (grammes)",
          type: "number",
          defaultValue: 1000,
        },
      ],
    },
    metadata: {
      website: "https://www.mondialrelay.fr",
      documentationUrl: "https://connect.mondialrelay.com",
      documentationLabel: "Portail Développeur Mondial Relay",
      companyName: "Mondial Relay (InPost Group)",
      headquartersCountry: "France",
    },
  },

  // 4. Colissimo La Poste
  {
    id: "colissimo",
    code: "COLISSIMO",
    name: "La Poste Colissimo (Domicile & Sans Signature)",
    category: "DELIVERY",
    capabilities: [
      "delivery.home_delivery",
      "delivery.quote",
      "delivery.tracking",
      "delivery.label",
    ],
    supportedMarkets: ["FR", "BE", "CH", "ES", "LU", "DE"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "contractNumber",
          label: "Numéro de Contrat Colissimo Entreprise",
          type: "text",
          placeholder: "999999",
          required: true,
        },
        {
          key: "apiPassword",
          label: "Mot de passe API Web Service Colissimo",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.colissimo.fr",
      documentationUrl: "https://www.colissimo.entreprise.laposte.fr",
      documentationLabel: "Documentation Colissimo Box",
      companyName: "La Poste Groupe",
      headquartersCountry: "France",
    },
  },

  // 5. Chronopost Express
  {
    id: "chronopost",
    code: "CHRONOPOST",
    name: "Chronopost Express 24H (France & Europe)",
    category: "DELIVERY",
    capabilities: [
      "delivery.express",
      "delivery.quote",
      "delivery.tracking",
      "delivery.label",
    ],
    supportedMarkets: ["FR", "BE", "CH", "ES", "LU", "DE"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "accountNumber",
          label: "Numéro de Compte Chronopost",
          type: "text",
          placeholder: "12345678",
          required: true,
        },
        {
          key: "accountPassword",
          label: "Mot de passe Compte API",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.chronopost.fr",
      documentationUrl:
        "https://www.chronopost.fr/fr/entreprises/solutions-e-commerce/api",
      documentationLabel: "API Chronopost",
      companyName: "Chronopost (Geopost / DPDgroup)",
      headquartersCountry: "France",
    },
  },

  // 6. Cocolis (Transport Volumineux / Covoiturage de Colis)
  {
    id: "cocolis",
    code: "COCOLIS",
    name: "Cocolis (Transport Meubles & Objets Volumineux)",
    category: "DELIVERY",
    capabilities: ["delivery.bulky", "delivery.quote", "delivery.tracking"],
    supportedMarkets: ["FR", "BE"],
    supportedCurrencies: ["EUR"],
    supportedLocales: ["fr-FR"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "apiAppId",
          label: "ID Application Partenaire Cocolis",
          type: "text",
          placeholder: "shongre_bulky_01",
          required: true,
        },
        {
          key: "apiSecretToken",
          label: "Jeton Secret API Cocolis",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.cocolis.fr",
      documentationUrl: "https://docs.cocolis.fr",
      documentationLabel: "Documentation API Cocolis",
      companyName: "Cocolis SAS",
      headquartersCountry: "France",
    },
  },

  // 7. Google Identity (OAuth 2.0)
  {
    id: "google_identity",
    code: "GOOGLE_IDENTITY",
    name: "Google Identity Services (OAuth 2.0 & One Tap)",
    category: "AUTHENTICATION",
    capabilities: ["auth.oauth_google"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "clientId",
          label: "Google Client ID (Identifiant Public Web)",
          type: "text",
          placeholder: "123456789-xxxxxx.apps.googleusercontent.com",
          required: true,
        },
        {
          key: "clientSecret",
          label: "Google Client Secret (Serveur)",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://developers.google.com/identity",
      documentationUrl: "https://developers.google.com/identity/gsi/web",
      documentationLabel: "Google Identity Services Web",
      companyName: "Google LLC",
      headquartersCountry: "États-Unis",
    },
  },

  // 8. Sign in with Apple
  {
    id: "apple_id",
    code: "APPLE_ID",
    name: "Sign in with Apple",
    category: "AUTHENTICATION",
    capabilities: ["auth.oauth_apple"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "servicesId",
          label: "Apple Services ID (Client ID)",
          type: "text",
          placeholder: "com.shongre.platform.signin",
          required: true,
        },
        {
          key: "teamId",
          label: "Apple Developer Team ID",
          type: "text",
          placeholder: "A1B2C3D4E5",
          required: true,
        },
        {
          key: "privateKey",
          label: "Clé Privée Apple .p8 (Serveur)",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://developer.apple.com/sign-in-with-apple/",
      documentationUrl:
        "https://developer.apple.com/documentation/sign_in_with_apple",
      documentationLabel: "Apple Sign In Documentation",
      companyName: "Apple Inc.",
      headquartersCountry: "États-Unis",
    },
  },

  // 9. Resend (Transactional Email)
  {
    id: "resend",
    code: "RESEND_EMAIL",
    name: "Resend (candidat email)",
    category: "EMAIL",
    capabilities: ["email.transactional"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "apiKey",
          label: "Clé API Resend (API Key)",
          type: "password",
          placeholder: "re_••••••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "fromEmail",
          label: "Adresse d'expédition par défaut",
          type: "text",
          defaultValue: "notifications@shongre.com",
          required: true,
        },
      ],
    },
    metadata: {
      website: "https://resend.com",
      documentationUrl: "https://resend.com/docs",
      documentationLabel: "Documentation API Resend",
      companyName: "Resend Inc.",
      headquartersCountry: "États-Unis",
    },
  },

  // 10. Brevo (Marketing & Transactional Email / Newsletter)
  {
    id: "brevo",
    code: "BREVO_MARKETING",
    name: "Brevo (candidat email/marketing)",
    category: "EMAIL",
    capabilities: [
      "email.marketing",
      "email.transactional",
      "sms.transactional",
    ],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "apiKey",
          label: "Clé API Brevo v3",
          type: "password",
          placeholder: "xkeysib-••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "defaultSenderName",
          label: "Nom de l'expéditeur visible",
          type: "text",
          defaultValue: "L'équipe Shongre",
          required: true,
        },
      ],
    },
    metadata: {
      website: "https://www.brevo.com",
      documentationUrl: "https://developers.brevo.com",
      documentationLabel: "Documentation Développeur Brevo",
      companyName: "Brevo SAS",
      headquartersCountry: "France",
    },
  },

  // 11. Twilio (SMS OTP)
  {
    id: "twilio",
    code: "TWILIO_SMS",
    name: "Twilio (candidat SMS/OTP)",
    category: "SMS",
    capabilities: ["sms.otp", "sms.transactional"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "accountSid",
          label: "Twilio Account SID",
          type: "text",
          placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          required: true,
        },
        {
          key: "authToken",
          label: "Twilio Auth Token",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.twilio.com",
      documentationUrl: "https://www.twilio.com/docs/sms",
      documentationLabel: "Documentation Twilio Programmable SMS",
      companyName: "Twilio Inc.",
      headquartersCountry: "États-Unis",
    },
  },

  // 12. Google Gemini 2.5 Flash
  {
    id: "google_gemini",
    code: "GOOGLE_GEMINI",
    name: "Google Gemini (démo uniquement)",
    category: "AI",
    capabilities: [
      "ai.listing_assistance",
      "ai.safety_audit",
      "ai.prospect_research",
      "ai.company_enrichment",
    ],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "apiKey",
          label: "Clé API Google AI Studio / Gemini",
          type: "password",
          placeholder: "AIzaSy••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "modelName",
          label: "Modèle de référence",
          type: "select",
          defaultValue: "gemini-2.5-flash",
          options: [
            {
              value: "gemini-2.5-flash",
              label: "Gemini 2.5 Flash (Rapide & Économique)",
            },
            {
              value: "gemini-2.5-pro",
              label: "Gemini 2.5 Pro (Raisonnement Avancé)",
            },
          ],
        },
      ],
    },
    metadata: {
      website: "https://ai.google.dev",
      documentationUrl: "https://ai.google.dev/gemini-api/docs",
      documentationLabel: "Documentation Google Gemini API",
      companyName: "Google LLC / DeepMind",
      headquartersCountry: "États-Unis",
    },
  },

  // 13. OpenAI GPT-4o (Fallback AI)
  {
    id: "openai",
    code: "OPENAI",
    name: "OpenAI (candidat IA)",
    category: "AI",
    capabilities: [
      "ai.listing_assistance",
      "ai.safety_audit",
      "ai.prospect_research",
    ],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "apiKey",
          label: "Clé API OpenAI (Secret Key)",
          type: "password",
          placeholder: "sk-proj-••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "model",
          label: "Identifiant Modèle",
          type: "select",
          defaultValue: "gpt-4o-mini",
          options: [
            { value: "gpt-4o-mini", label: "GPT-4o Mini (Secours standard)" },
            { value: "gpt-4o", label: "GPT-4o (Complet)" },
          ],
        },
      ],
    },
    metadata: {
      website: "https://openai.com",
      documentationUrl: "https://platform.openai.com/docs",
      documentationLabel: "Documentation OpenAI Platform",
      companyName: "OpenAI LLC",
      headquartersCountry: "États-Unis",
    },
  },

  // 14. Tavily AI Search (Web Search for CRM Prospecting)
  {
    id: "tavily",
    code: "TAVILY_SEARCH",
    name: "Tavily (candidat recherche web)",
    category: "SEARCH",
    capabilities: ["search.public_web"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "apiKey",
          label: "Clé API Tavily Search",
          type: "password",
          placeholder: "tvly-••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://tavily.com",
      documentationUrl: "https://docs.tavily.com",
      documentationLabel: "Tavily Search API Docs",
      companyName: "Tavily Inc.",
      headquartersCountry: "États-Unis",
    },
  },

  // 15. Meilisearch (Marketplace Internal Search)
  {
    id: "meilisearch",
    code: "MEILISEARCH",
    name: "Meilisearch (non requis actuellement)",
    category: "SEARCH",
    capabilities: ["search.marketplace"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "hostUrl",
          label: "URL de l'Instance Meilisearch",
          type: "url",
          placeholder: "https://search.shongre.internal",
          required: true,
        },
        {
          key: "searchApiKey",
          label: "Clé API de Recherche Publique",
          type: "text",
          placeholder: "search_key_••••••••",
          required: true,
        },
      ],
    },
    metadata: {
      website: "https://www.meilisearch.com",
      documentationUrl: "https://www.meilisearch.com/docs",
      documentationLabel: "Documentation Meilisearch",
      companyName: "Meili SAS",
      headquartersCountry: "France",
    },
  },

  // 16. OpenStreetMap & Base Adresse Nationale (BAN)
  {
    id: "osm_nominatim",
    code: "OSM_NOMINATIM",
    name: "OpenStreetMap tiles / BAN (partiel)",
    category: "GEOCODING",
    capabilities: [
      "maps.display",
      "maps.geocode",
      "maps.reverse_geocode",
      "maps.autocomplete",
    ],
    supportedMarkets: ["FR", "BE", "CH", "ES", "LU", "DE"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "userAgent",
          label: "User-Agent Client HTTP Shongre",
          type: "text",
          defaultValue: "ShongrePlatform/2.0 (contact@shongre.com)",
          required: true,
        },
        {
          key: "preferBanInFrance",
          label:
            "Utiliser l'API gouvernementale BAN en priorité pour la France",
          type: "boolean",
          defaultValue: true,
        },
      ],
    },
    metadata: {
      website: "https://adresse.data.gouv.fr",
      documentationUrl: "https://adresse.data.gouv.fr/api-doc/adresse",
      documentationLabel: "Documentation API Adresse France",
      companyName: "DINUM / OpenStreetMap Foundation",
      headquartersCountry: "France / International",
    },
  },

  // 17. INSEE API SIRENE (Vérification Entreprises KYB)
  {
    id: "insee_sirene",
    code: "INSEE_SIRENE",
    name: "INSEE API SIRENE",
    category: "BUSINESS_VERIFICATION",
    capabilities: ["verification.business", "verification.vat"],
    supportedMarkets: ["FR"],
    supportedCurrencies: ["EUR"],
    supportedLocales: ["fr-FR"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "apiToken",
          label: "Jeton API INSEE SIRENE",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.insee.fr",
      documentationUrl: "https://portail-api.insee.fr/",
      documentationLabel: "Portail API INSEE",
      companyName:
        "Institut national de la statistique et des études économiques",
      headquartersCountry: "France",
    },
  },

  // 18. Stripe Identity (KYC Identity Verification)
  {
    id: "stripe_identity",
    code: "STRIPE_IDENTITY",
    name: "Stripe Identity",
    category: "IDENTITY_VERIFICATION",
    capabilities: ["verification.identity"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "apiKey",
          label: "Clé publique Stripe",
          type: "text",
          placeholder: "pk_live_••••••••",
          required: true,
        },
        {
          key: "apiSecret",
          label: "Clé secrète Stripe",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://stripe.com/identity",
      documentationUrl: "https://docs.stripe.com/identity",
      documentationLabel: "Documentation Stripe Identity",
      companyName: "Stripe Payments Europe Ltd.",
      headquartersCountry: "Irlande (UE)",
    },
  },

  // 19. Cloudflare R2 & Image CDN
  {
    id: "cloudflare_r2",
    code: "CLOUDFLARE_R2",
    name: "Cloudflare R2 (non requis actuellement)",
    category: "STORAGE",
    capabilities: [
      "storage.media",
      "storage.document",
      "cdn.delivery",
      "image.optimization",
    ],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "accountId",
          label: "Cloudflare Account ID",
          type: "text",
          placeholder: "cf_acc_xxxxxxxxxxxxxxxx",
          required: true,
        },
        {
          key: "bucketMediaName",
          label: "Nom du Bucket R2 (Médias Publics)",
          type: "text",
          defaultValue: "shongre-media-public",
          required: true,
        },
        {
          key: "apiTokenSecret",
          label: "Jeton API Cloudflare R2",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.cloudflare.com/developer-platform/r2/",
      documentationUrl: "https://developers.cloudflare.com/r2/",
      documentationLabel: "Cloudflare R2 Docs",
      companyName: "Cloudflare Inc.",
      headquartersCountry: "États-Unis",
    },
  },

  // 20. Plausible Analytics (Privacy-Friendly GDPR)
  {
    id: "plausible",
    code: "PLAUSIBLE",
    name: "Plausible (candidat analytics)",
    category: "ANALYTICS",
    capabilities: ["analytics.product"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: true,
    configurationSchema: {
      fields: [
        {
          key: "domain",
          label: "Nom de domaine déclaré",
          type: "text",
          defaultValue: "shongre.com",
          required: true,
        },
        {
          key: "scriptSource",
          label: "URL du script de télémétrie",
          type: "url",
          defaultValue: "https://plausible.io/js/script.js",
        },
      ],
    },
    metadata: {
      website: "https://plausible.io",
      documentationUrl: "https://plausible.io/docs",
      documentationLabel: "Documentation Plausible",
      companyName: "Plausible Insights OÜ",
      headquartersCountry: "Estonie (UE)",
    },
  },

  // 21. Sentry (Error Tracking & APM)
  {
    id: "sentry",
    code: "SENTRY",
    name: "Sentry (candidat observabilité)",
    category: "ERROR_MONITORING",
    capabilities: ["monitoring.error_tracking"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "dsn",
          label: "Sentry DSN (Data Source Name)",
          type: "url",
          placeholder: "https://xxxx@o123456.ingest.sentry.io/78910",
          required: true,
        },
        {
          key: "tracesSampleRate",
          label: "Taux d'échantillonnage des traces APM (0.0 à 1.0)",
          type: "number",
          defaultValue: 0.1,
        },
      ],
    },
    metadata: {
      website: "https://sentry.io",
      documentationUrl: "https://docs.sentry.io/platforms/javascript/",
      documentationLabel: "Documentation Sentry Browser",
      companyName: "Functional Software Inc. (Sentry)",
      headquartersCountry: "États-Unis",
    },
  },

  // 22. Cloudflare Turnstile (Privacy-friendly CAPTCHA)
  {
    id: "cloudflare_turnstile",
    code: "CLOUDFLARE_TURNSTILE",
    name: "Cloudflare Turnstile (candidat anti-bot)",
    category: "CAPTCHA",
    capabilities: ["security.captcha"],
    supportedMarkets: ["*"],
    supportedCurrencies: ["EUR", "CHF"],
    supportedLocales: ["fr-FR", "en-US", "es-ES", "de-DE"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "siteKey",
          label: "Turnstile Site Key (Clé Publique)",
          type: "text",
          placeholder: "0x4AAAAAAxxxxxxxx",
          required: true,
        },
        {
          key: "secretKey",
          label: "Turnstile Secret Key (Serveur)",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
      ],
    },
    metadata: {
      website: "https://www.cloudflare.com/products/turnstile/",
      documentationUrl: "https://developers.cloudflare.com/turnstile/",
      documentationLabel: "Cloudflare Turnstile Docs",
      companyName: "Cloudflare Inc.",
      headquartersCountry: "États-Unis",
    },
  },

  // 23. Pennylane (Electronic Invoicing / Factur-X)
  {
    id: "pennylane",
    code: "PENNYLANE",
    name: "Pennylane (candidat facturation)",
    category: "INVOICING",
    capabilities: ["invoicing.electronic"],
    supportedMarkets: ["FR"],
    supportedCurrencies: ["EUR"],
    supportedLocales: ["fr-FR"],
    integrationReadiness: "implemented_demo",
    isCustomizablePerMarket: false,
    configurationSchema: {
      fields: [
        {
          key: "apiToken",
          label: "Jeton API Pennylane Partenaire",
          type: "password",
          placeholder: "••••••••••••••••",
          required: true,
          secret: true,
        },
        {
          key: "companyId",
          label: "Identifiant Entreprise Pennylane",
          type: "text",
          placeholder: "shongre_sas_01",
          required: true,
        },
      ],
    },
    metadata: {
      website: "https://www.pennylane.com",
      documentationUrl: "https://pennylane.readme.io",
      documentationLabel: "Documentation API Pennylane",
      companyName: "Pennylane SAS",
      headquartersCountry: "France",
    },
  },
];

const readinessFor = (
  adapterStatus: ProviderAdapterStatus,
): Provider["integrationReadiness"] => {
  if (adapterStatus === "NONE") return "not_implemented";
  if (adapterStatus === "DEMO_ONLY") return "demo_only";
  return "implemented_unverified";
};

/**
 * Presentation metadata is enriched from the shared code-audited manifest.
 * A missing definition is a build-time error instead of a decorative card.
 */
export const CANONICAL_PROVIDER_REGISTRY: Provider[] =
  PROVIDER_PRESENTATION_REGISTRY.map((provider) => {
    const operational = getProviderOperationalDefinition(provider.id);
    if (!operational) {
      throw new Error(
        `Provider ${provider.id} is missing from the canonical operational registry.`,
      );
    }
    return {
      ...provider,
      integrationReadiness: readinessFor(operational.adapterStatus),
      operational,
    };
  });

export function getProviderById(id: string): Provider | undefined {
  return CANONICAL_PROVIDER_REGISTRY.find((p) => p.id === id);
}

export function getProvidersByCategory(
  category: Provider["category"],
): Provider[] {
  return CANONICAL_PROVIDER_REGISTRY.filter((p) => p.category === category);
}

export function getProvidersByCapability(
  capability: Provider["capabilities"][number],
): Provider[] {
  return CANONICAL_PROVIDER_REGISTRY.filter((p) =>
    p.capabilities.includes(capability),
  );
}
