/**
 * SHONGRE CANONICAL MARKETPLACE TAXONOMY DATA
 * Exhaustive multi-level taxonomy covering 31 domains with attributes, condition schemes and capabilities.
 */

import { TaxonomyNode } from "./taxonomy.types";
import {
  Category,
  SubCategory,
  CategoryAttributeSchema,
  AttributeInputType,
} from "../../types";
import { ATTRIBUTE_REGISTRY } from "./attribute.registry";
import { CONDITION_SCHEMES } from "./condition.schemes";
import { getTaxonomyLabel } from "./taxonomy.labels";
import { activeDataLocale } from "../../i18n/localized";
import { themeColors } from "@shongre/design-tokens";

export { ATTRIBUTE_REGISTRY } from "./attribute.registry";
export { CONDITION_SCHEMES } from "./condition.schemes";

const BASE_CANONICAL_TAXONOMY: TaxonomyNode[] = [
  // =========================================================================
  // 1. VÉHICULES & MOBILITÉ
  // =========================================================================
  {
    id: "vehicles",
    code: "VEH",
    slug: "vehicules",
    level: "category",
    labels: { "fr-FR": "Véhicules", "en-US": "Vehicles" },
    shortLabels: { "fr-FR": "Véhicules", "en-US": "Vehicles" },
    name: "Véhicules",
    label: "Véhicules",
    shortLabel: "Véhicules",
    iconName: "Car",
    accentColor: themeColors["category-vehicles"],
    sortOrder: 1,
    status: "active",
    conditionScheme: "vehicle",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: true,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "vehicle.brand",
      "vehicle.model",
      "vehicle.year",
      "vehicle.mileage",
      "vehicle.fuel",
      "vehicle.gearbox",
      "vehicle.critair",
    ],
    summaryAttributeIds: ["vehicle.year", "vehicle.mileage", "vehicle.fuel"],
    filterFacetIds: [
      "vehicle.brand",
      "vehicle.year",
      "vehicle.mileage",
      "vehicle.fuel",
      "vehicle.gearbox",
    ],
    children: [
      {
        id: "vehicles.cars",
        code: "VEH_CARS",
        slug: "voitures",
        parentId: "vehicles",
        ancestorIds: ["vehicles"],
        level: "subcategory",
        labels: { "fr-FR": "Voitures d'occasion", "en-US": "Used Cars" },
        shortLabels: { "fr-FR": "Voitures", "en-US": "Cars" },
        name: "Voitures d'occasion",
        label: "Voitures d'occasion",
        shortLabel: "Voitures",
        sortOrder: 1,
        status: "active",
        conditionScheme: "vehicle",
        attributeIds: [
          "vehicle.brand",
          "vehicle.model",
          "vehicle.year",
          "vehicle.mileage",
          "vehicle.body_type",
          "vehicle.fuel",
          "vehicle.gearbox",
          "vehicle.critair",
          "vehicle.doors",
          "vehicle.seats",
          "vehicle.fiscal_power",
          "vehicle.engine_power_din",
          "vehicle.battery_capacity",
          "vehicle.electric_range",
          "vehicle.first_hand",
        ],
        summaryAttributeIds: [
          "vehicle.year",
          "vehicle.mileage",
          "vehicle.fuel",
        ],
        filterFacetIds: [
          "vehicle.brand",
          "vehicle.year",
          "vehicle.mileage",
          "vehicle.fuel",
          "vehicle.gearbox",
          "vehicle.critair",
          "vehicle.body_type",
        ],
        children: [
          {
            id: "vehicles.cars.citadines",
            code: "VEH_CARS_CITADINE",
            slug: "citadines",
            parentId: "vehicles.cars",
            ancestorIds: ["vehicles", "vehicles.cars"],
            level: "type",
            labels: { "fr-FR": "Citadines", "en-US": "City cars" },
            name: "Citadines",
            label: "Citadines",
            sortOrder: 1,
            status: "active",
            summaryAttributeIds: [
              "vehicle.year",
              "vehicle.mileage",
              "vehicle.fuel",
            ],
          },
          {
            id: "vehicles.cars.berlines",
            code: "VEH_CARS_BERLINE",
            slug: "berlines",
            parentId: "vehicles.cars",
            ancestorIds: ["vehicles", "vehicles.cars"],
            level: "type",
            labels: { "fr-FR": "Berlines", "en-US": "Sedans" },
            name: "Berlines",
            label: "Berlines",
            sortOrder: 2,
            status: "active",
            summaryAttributeIds: [
              "vehicle.year",
              "vehicle.mileage",
              "vehicle.fuel",
            ],
          },
          {
            id: "vehicles.cars.suv",
            code: "VEH_CARS_SUV",
            slug: "suv-4x4",
            parentId: "vehicles.cars",
            ancestorIds: ["vehicles", "vehicles.cars"],
            level: "type",
            labels: { "fr-FR": "SUV & 4x4", "en-US": "SUVs & 4x4" },
            name: "SUV & 4x4",
            label: "SUV & 4x4",
            sortOrder: 3,
            status: "active",
            summaryAttributeIds: [
              "vehicle.year",
              "vehicle.mileage",
              "vehicle.fuel",
            ],
          },
          {
            id: "vehicles.cars.breaks",
            code: "VEH_CARS_BREAK",
            slug: "breaks",
            parentId: "vehicles.cars",
            ancestorIds: ["vehicles", "vehicles.cars"],
            level: "type",
            labels: { "fr-FR": "Breaks", "en-US": "Station wagons" },
            name: "Breaks",
            label: "Breaks",
            sortOrder: 4,
            status: "active",
            summaryAttributeIds: [
              "vehicle.year",
              "vehicle.mileage",
              "vehicle.fuel",
            ],
          },
          {
            id: "vehicles.cars.coupes_cabriolets",
            code: "VEH_CARS_COUPE",
            slug: "coupes-cabriolets",
            parentId: "vehicles.cars",
            ancestorIds: ["vehicles", "vehicles.cars"],
            level: "type",
            labels: {
              "fr-FR": "Coupés & Cabriolets",
              "en-US": "Coupes & Convertibles",
            },
            name: "Coupés & Cabriolets",
            label: "Coupés & Cabriolets",
            sortOrder: 5,
            status: "active",
            summaryAttributeIds: [
              "vehicle.year",
              "vehicle.mileage",
              "vehicle.fuel",
            ],
          },
          {
            id: "vehicles.cars.utilitaires",
            code: "VEH_CARS_UTILITAIRE",
            slug: "utilitaires-fourgons",
            parentId: "vehicles.cars",
            ancestorIds: ["vehicles", "vehicles.cars"],
            level: "type",
            labels: {
              "fr-FR": "Utilitaires & Fourgons",
              "en-US": "Vans & Commercial",
            },
            name: "Utilitaires & Fourgons",
            label: "Utilitaires & Fourgons",
            sortOrder: 6,
            status: "active",
            summaryAttributeIds: [
              "vehicle.year",
              "vehicle.mileage",
              "vehicle.fuel",
            ],
          },
        ],
      },
      {
        id: "vehicles.motos",
        code: "VEH_MOTOS",
        slug: "motos-scooters",
        parentId: "vehicles",
        ancestorIds: ["vehicles"],
        level: "subcategory",
        labels: {
          "fr-FR": "Motos & Scooters",
          "en-US": "Motorcycles & Scooters",
        },
        shortLabels: { "fr-FR": "Motos & Scooters", "en-US": "Motorcycles" },
        name: "Motos & Scooters",
        label: "Motos & Scooters",
        shortLabel: "Motos & Scooters",
        sortOrder: 2,
        status: "active",
        conditionScheme: "vehicle",
        attributeIds: [
          "vehicle.brand",
          "vehicle.model",
          "vehicle.year",
          "vehicle.mileage",
          "vehicle.fuel",
          "vehicle.critair",
        ],
        summaryAttributeIds: [
          "vehicle.year",
          "vehicle.mileage",
          "vehicle.fuel",
        ],
        filterFacetIds: ["vehicle.brand", "vehicle.year", "vehicle.mileage"],
      },
      {
        id: "vehicles.cycles",
        code: "VEH_CYCLES",
        slug: "velos-trottinettes",
        parentId: "vehicles",
        ancestorIds: ["vehicles"],
        level: "subcategory",
        labels: {
          "fr-FR": "Vélos & Trottinettes électriques",
          "en-US": "Bicycles & E-scooters",
        },
        shortLabels: {
          "fr-FR": "Vélos & Trottinettes",
          "en-US": "Bikes & Scooters",
        },
        name: "Vélos & Trottinettes électriques",
        label: "Vélos & Trottinettes électriques",
        shortLabel: "Vélos & Trottinettes",
        sortOrder: 3,
        status: "active",
        conditionScheme: "consumer_product",
        capabilities: {
          fulfillmentModes: [
            "hand_delivery",
            "parcel_shipping",
            "heavy_delivery",
          ],
        },
        attributeIds: ["product.brand", "product.model", "product.color"],
        summaryAttributeIds: ["product.brand", "product.model"],
      },
      {
        id: "vehicles.parts",
        code: "VEH_PARTS",
        slug: "equipement-pieces-auto-moto",
        parentId: "vehicles",
        ancestorIds: ["vehicles"],
        level: "subcategory",
        labels: {
          "fr-FR": "Équipements & Pièces Auto / Moto",
          "en-US": "Auto & Moto Parts",
        },
        shortLabels: {
          "fr-FR": "Pièces auto & moto",
          "en-US": "Auto & Moto Parts",
        },
        name: "Équipements & Pièces Auto / Moto",
        label: "Équipements & Pièces Auto / Moto",
        shortLabel: "Pièces auto & moto",
        sortOrder: 4,
        status: "active",
        conditionScheme: "consumer_product",
        capabilities: {
          fulfillmentModes: [
            "hand_delivery",
            "parcel_shipping",
            "heavy_delivery",
          ],
        },
        attributeIds: ["product.brand", "product.model"],
      },
    ],
  },

  // =========================================================================
  // 2. IMMOBILIER
  // =========================================================================
  {
    id: "real_estate",
    code: "RE",
    slug: "immobilier",
    level: "category",
    labels: { "fr-FR": "Immobilier", "en-US": "Real Estate" },
    shortLabels: { "fr-FR": "Immobilier", "en-US": "Real Estate" },
    name: "Immobilier",
    label: "Immobilier",
    shortLabel: "Immobilier",
    iconName: "Building",
    accentColor: themeColors["category-real-estate"],
    sortOrder: 2,
    status: "active",
    conditionScheme: "real_estate",
    capabilities: {
      canSell: true,
      canGive: false,
      canExchange: false,
      canRent: true,
      reservationAllowed: false,
      securePaymentAllowed: false,
      negotiablePrice: true,
      fulfillmentModes: ["none"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "real_estate.property_type",
      "real_estate.surface",
      "real_estate.rooms",
      "real_estate.bedrooms",
      "real_estate.energy_class",
      "real_estate.ges_class",
    ],
    summaryAttributeIds: [
      "real_estate.surface",
      "real_estate.rooms",
      "real_estate.property_type",
    ],
    filterFacetIds: [
      "real_estate.property_type",
      "real_estate.surface",
      "real_estate.rooms",
      "real_estate.energy_class",
    ],
    children: [
      {
        id: "real_estate.sales",
        code: "RE_SALES",
        slug: "ventes-immobilieres",
        parentId: "real_estate",
        ancestorIds: ["real_estate"],
        level: "subcategory",
        labels: {
          "fr-FR": "Ventes immobilières",
          "en-US": "Properties for Sale",
        },
        shortLabels: { "fr-FR": "Ventes immo", "en-US": "For Sale" },
        name: "Ventes immobilières",
        label: "Ventes immobilières",
        shortLabel: "Ventes immo",
        sortOrder: 1,
        status: "active",
        attributeIds: [
          "real_estate.property_type",
          "real_estate.surface",
          "real_estate.land_surface",
          "real_estate.rooms",
          "real_estate.bedrooms",
          "real_estate.floor",
          "real_estate.elevator",
          "real_estate.balcony_terrace",
          "real_estate.energy_class",
          "real_estate.ges_class",
        ],
        summaryAttributeIds: [
          "real_estate.surface",
          "real_estate.rooms",
          "real_estate.property_type",
        ],
        filterFacetIds: [
          "real_estate.property_type",
          "real_estate.surface",
          "real_estate.rooms",
          "real_estate.energy_class",
        ],
      },
      {
        id: "real_estate.rentals",
        code: "RE_RENTALS",
        slug: "locations-immobilieres",
        parentId: "real_estate",
        ancestorIds: ["real_estate"],
        level: "subcategory",
        labels: {
          "fr-FR": "Locations à l'année",
          "en-US": "Long-term Rentals",
        },
        shortLabels: { "fr-FR": "Locations", "en-US": "Rentals" },
        name: "Locations à l'année",
        label: "Locations à l'année",
        shortLabel: "Locations",
        sortOrder: 2,
        status: "active",
        attributeIds: [
          "real_estate.property_type",
          "real_estate.surface",
          "real_estate.rooms",
          "real_estate.bedrooms",
          "real_estate.furnished",
          "real_estate.charges_included",
          "real_estate.floor",
          "real_estate.elevator",
          "real_estate.energy_class",
        ],
        summaryAttributeIds: [
          "real_estate.surface",
          "real_estate.rooms",
          "real_estate.furnished",
        ],
        filterFacetIds: [
          "real_estate.property_type",
          "real_estate.surface",
          "real_estate.rooms",
          "real_estate.furnished",
        ],
      },
      {
        id: "real_estate.commercial",
        code: "RE_COMMERCIAL",
        slug: "bureaux-commerces",
        parentId: "real_estate",
        ancestorIds: ["real_estate"],
        level: "subcategory",
        labels: {
          "fr-FR": "Bureaux & Commerces",
          "en-US": "Commercial Properties",
        },
        shortLabels: { "fr-FR": "Bureaux & Commerces", "en-US": "Commercial" },
        name: "Bureaux & Commerces",
        label: "Bureaux & Commerces",
        shortLabel: "Bureaux & Commerces",
        sortOrder: 3,
        status: "active",
        attributeIds: [
          "real_estate.property_type",
          "real_estate.surface",
          "real_estate.energy_class",
        ],
        summaryAttributeIds: [
          "real_estate.surface",
          "real_estate.property_type",
        ],
      },
      {
        id: "real_estate.parking",
        code: "RE_PARKING",
        slug: "parkings-garages",
        parentId: "real_estate",
        ancestorIds: ["real_estate"],
        level: "subcategory",
        labels: { "fr-FR": "Parkings & Garages", "en-US": "Parking & Garages" },
        shortLabels: { "fr-FR": "Parkings & Garages", "en-US": "Parking" },
        name: "Parkings & Garages",
        label: "Parkings & Garages",
        shortLabel: "Parkings & Garages",
        sortOrder: 4,
        status: "active",
        summaryAttributeIds: ["real_estate.property_type"],
      },
    ],
  },

  // =========================================================================
  // 3. EMPLOI
  // =========================================================================
  {
    id: "jobs",
    code: "JOB",
    slug: "emploi",
    level: "category",
    labels: { "fr-FR": "Emploi & Recrutement", "en-US": "Jobs & Careers" },
    shortLabels: { "fr-FR": "Emploi", "en-US": "Jobs" },
    name: "Emploi & Recrutement",
    label: "Emploi & Recrutement",
    shortLabel: "Emploi",
    iconName: "Briefcase",
    accentColor: themeColors["category-jobs"],
    sortOrder: 3,
    status: "active",
    conditionScheme: "job",
    verticalType: "employment",
    verticalSchemaVersion: 1,
    capabilities: {
      canSell: false,
      canGive: false,
      canExchange: false,
      canRent: false,
      reservationAllowed: false,
      securePaymentAllowed: false,
      negotiablePrice: true,
      fulfillmentModes: ["none"],
    },
    sellerEligibility: {
      individualAllowed: true,
      proAllowed: true,
      proVerificationRequired: false,
    },
    attributeIds: [
      "job.contract_type",
      "job.sector",
      "job.experience_level",
      "job.telework",
      "job.salary_annual_keur",
    ],
    presentation: {
      cardAttributeIds: ["job.contract_type", "job.telework"],
    },
    summaryAttributeIds: ["job.contract_type", "job.sector", "job.telework"],
    filterFacetIds: [
      "job.contract_type",
      "job.sector",
      "job.telework",
      "job.experience_level",
    ],
    children: [
      {
        id: "jobs.offers",
        code: "JOB_OFFERS",
        slug: "offres-d-emploi",
        parentId: "jobs",
        ancestorIds: ["jobs"],
        level: "subcategory",
        labels: { "fr-FR": "Offres d'emploi", "en-US": "Job Offers" },
        shortLabels: { "fr-FR": "Offres d'emploi", "en-US": "Job Offers" },
        name: "Offres d'emploi",
        label: "Offres d'emploi",
        shortLabel: "Offres d'emploi",
        sortOrder: 1,
        status: "active",
        verticalType: "employment",
        verticalSchemaVersion: 1,
        attributeIds: [
          "job.contract_type",
          "job.sector",
          "job.experience_level",
          "job.telework",
          "job.salary_annual_keur",
        ],
        presentation: {
          cardAttributeIds: ["job.contract_type", "job.telework"],
        },
        summaryAttributeIds: [
          "job.contract_type",
          "job.sector",
          "job.telework",
        ],
        filterFacetIds: ["job.contract_type", "job.sector", "job.telework"],
      },
    ],
  },

  // =========================================================================
  // 4. SERVICES & PRESTATIONS
  // =========================================================================
  {
    id: "services",
    code: "SRV",
    slug: "services",
    level: "category",
    labels: { "fr-FR": "Services & Prestations", "en-US": "Services" },
    shortLabels: { "fr-FR": "Services", "en-US": "Services" },
    name: "Services & Prestations",
    label: "Services & Prestations",
    shortLabel: "Services",
    iconName: "Wrench",
    accentColor: themeColors["category-services"],
    sortOrder: 4,
    status: "active",
    conditionScheme: "service",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["on_site_service", "none"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "service.billing_mode",
      "service.location_mode",
      "service.pro_decennale_insurance",
    ],
    summaryAttributeIds: ["service.billing_mode", "service.location_mode"],
    filterFacetIds: ["service.billing_mode", "service.location_mode"],
    children: [
      {
        id: "services.home_repairs",
        code: "SRV_HOME",
        slug: "bricolage-travaux",
        parentId: "services",
        ancestorIds: ["services"],
        level: "subcategory",
        labels: {
          "fr-FR": "Bricolage, Rénovation & Travaux",
          "en-US": "Home Improvement",
        },
        shortLabels: {
          "fr-FR": "Bricolage & Travaux",
          "en-US": "Home Repairs",
        },
        name: "Bricolage, Rénovation & Travaux",
        label: "Bricolage, Rénovation & Travaux",
        shortLabel: "Bricolage & Travaux",
        sortOrder: 1,
        status: "active",
        attributeIds: [
          "service.billing_mode",
          "service.location_mode",
          "service.pro_decennale_insurance",
        ],
        summaryAttributeIds: ["service.billing_mode", "service.location_mode"],
      },
      {
        id: "services.tutoring",
        code: "SRV_TUTOR",
        slug: "cours-particuliers",
        parentId: "services",
        ancestorIds: ["services"],
        level: "subcategory",
        labels: {
          "fr-FR": "Cours particuliers & Formation",
          "en-US": "Tutoring & Lessons",
        },
        shortLabels: { "fr-FR": "Cours & Formation", "en-US": "Tutoring" },
        name: "Cours particuliers & Formation",
        label: "Cours particuliers & Formation",
        shortLabel: "Cours & Formation",
        sortOrder: 2,
        status: "active",
        attributeIds: ["service.billing_mode", "service.location_mode"],
        summaryAttributeIds: ["service.billing_mode", "service.location_mode"],
      },
      {
        id: "services.events",
        code: "SRV_EVENT",
        slug: "evenementiel-animation",
        parentId: "services",
        ancestorIds: ["services"],
        level: "subcategory",
        labels: {
          "fr-FR": "Événementiel, Photo & DJ",
          "en-US": "Events & Entertainment",
        },
        shortLabels: { "fr-FR": "Événementiel & Photo", "en-US": "Events" },
        name: "Événementiel, Photo & DJ",
        label: "Événementiel, Photo & DJ",
        shortLabel: "Événementiel & Photo",
        sortOrder: 3,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 5. MAISON, MEUBLES & JARDIN
  // =========================================================================
  {
    id: "home_garden",
    code: "HOME",
    slug: "maison-jardin",
    level: "category",
    labels: { "fr-FR": "Maison, Meubles & Jardin", "en-US": "Home & Garden" },
    shortLabels: { "fr-FR": "Maison & Jardin", "en-US": "Home & Garden" },
    name: "Maison, Meubles & Jardin",
    label: "Maison, Meubles & Jardin",
    shortLabel: "Maison & Jardin",
    iconName: "Home",
    accentColor: themeColors["category-home-garden"],
    sortOrder: 5,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: ["product.brand", "product.color", "product.material"],
    summaryAttributeIds: ["product.brand", "product.color", "product.material"],
    filterFacetIds: ["product.brand", "product.color", "product.material"],
    children: [
      {
        id: "home_garden.furniture",
        code: "HOME_FURNITURE",
        slug: "mobilier",
        parentId: "home_garden",
        ancestorIds: ["home_garden"],
        level: "subcategory",
        labels: { "fr-FR": "Mobilier & Meubles", "en-US": "Furniture" },
        shortLabels: { "fr-FR": "Mobilier", "en-US": "Furniture" },
        name: "Mobilier & Meubles",
        label: "Mobilier & Meubles",
        shortLabel: "Mobilier",
        sortOrder: 1,
        status: "active",
        attributeIds: ["product.brand", "product.color", "product.material"],
        summaryAttributeIds: ["product.brand", "product.material"],
        filterFacetIds: ["product.brand", "product.color", "product.material"],
        children: [
          {
            id: "home_garden.furniture.sofas",
            code: "HOME_SOFAS",
            slug: "canapes-fauteuils",
            parentId: "home_garden.furniture",
            ancestorIds: ["home_garden", "home_garden.furniture"],
            level: "type",
            labels: {
              "fr-FR": "Canapés & Fauteuils",
              "en-US": "Sofas & Armchairs",
            },
            name: "Canapés & Fauteuils",
            label: "Canapés & Fauteuils",
            sortOrder: 1,
            status: "active",
          },
          {
            id: "home_garden.furniture.tables",
            code: "HOME_TABLES",
            slug: "tables-chaises",
            parentId: "home_garden.furniture",
            ancestorIds: ["home_garden", "home_garden.furniture"],
            level: "type",
            labels: { "fr-FR": "Tables & Chaises", "en-US": "Tables & Chairs" },
            name: "Tables & Chaises",
            label: "Tables & Chaises",
            sortOrder: 2,
            status: "active",
          },
          {
            id: "home_garden.furniture.beds",
            code: "HOME_BEDS",
            slug: "lits-literie",
            parentId: "home_garden.furniture",
            ancestorIds: ["home_garden", "home_garden.furniture"],
            level: "type",
            labels: { "fr-FR": "Lits & Literie", "en-US": "Beds & Mattresses" },
            name: "Lits & Literie",
            label: "Lits & Literie",
            sortOrder: 3,
            status: "active",
          },
        ],
      },
      {
        id: "home_garden.appliances",
        code: "HOME_APPLIANCES",
        slug: "electromenager",
        parentId: "home_garden",
        ancestorIds: ["home_garden"],
        level: "subcategory",
        labels: { "fr-FR": "Électroménager", "en-US": "Home Appliances" },
        shortLabels: { "fr-FR": "Électroménager", "en-US": "Appliances" },
        name: "Électroménager",
        label: "Électroménager",
        shortLabel: "Électroménager",
        sortOrder: 2,
        status: "active",
        attributeIds: ["product.brand", "product.model", "product.color"],
        summaryAttributeIds: ["product.brand", "product.model"],
      },
      {
        id: "home_garden.diy_garden",
        code: "HOME_DIY",
        slug: "bricolage-outillage-jardin",
        parentId: "home_garden",
        ancestorIds: ["home_garden"],
        level: "subcategory",
        labels: {
          "fr-FR": "Bricolage, Outillage & Jardin",
          "en-US": "DIY & Gardening",
        },
        shortLabels: { "fr-FR": "Bricolage & Jardin", "en-US": "DIY & Garden" },
        name: "Bricolage, Outillage & Jardin",
        label: "Bricolage, Outillage & Jardin",
        shortLabel: "Bricolage & Jardin",
        sortOrder: 3,
        status: "active",
        attributeIds: ["product.brand", "product.model"],
      },
    ],
  },

  // =========================================================================
  // 6. ÉLECTRONIQUE, MULTIMÉDIA & INFORMATIQUE
  // =========================================================================
  {
    id: "electronics",
    code: "ELEC",
    slug: "multimedia-electronique",
    level: "category",
    labels: {
      "fr-FR": "Électronique & Multimédia",
      "en-US": "Electronics & Tech",
    },
    shortLabels: { "fr-FR": "Multimédia", "en-US": "Tech" },
    name: "Électronique & Multimédia",
    label: "Électronique & Multimédia",
    shortLabel: "Multimédia",
    iconName: "Smartphone",
    accentColor: themeColors["category-multimedia"],
    sortOrder: 6,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "tech.brand",
      "tech.storage_capacity",
      "tech.ram_memory",
      "tech.screen_size_inches",
      "tech.battery_health_percent",
    ],
    summaryAttributeIds: [
      "tech.brand",
      "tech.storage_capacity",
      "tech.ram_memory",
    ],
    filterFacetIds: ["tech.brand", "tech.storage_capacity", "tech.ram_memory"],
    children: [
      {
        id: "electronics.smartphones",
        code: "ELEC_PHONES",
        slug: "smartphones-telephones",
        parentId: "electronics",
        ancestorIds: ["electronics"],
        level: "subcategory",
        labels: { "fr-FR": "Smartphones & Téléphones", "en-US": "Smartphones" },
        shortLabels: { "fr-FR": "Téléphones", "en-US": "Phones" },
        name: "Smartphones & Téléphones",
        label: "Smartphones & Téléphones",
        shortLabel: "Téléphones",
        sortOrder: 1,
        status: "active",
        attributeIds: [
          "tech.brand",
          "tech.storage_capacity",
          "tech.screen_size_inches",
          "tech.battery_health_percent",
          "product.color",
        ],
        summaryAttributeIds: [
          "tech.brand",
          "tech.storage_capacity",
          "product.color",
        ],
        filterFacetIds: [
          "tech.brand",
          "tech.storage_capacity",
          "product.color",
        ],
      },
      {
        id: "electronics.computers",
        code: "ELEC_COMPUTERS",
        slug: "informatique-pc-portables",
        parentId: "electronics",
        ancestorIds: ["electronics"],
        level: "subcategory",
        labels: {
          "fr-FR": "Informatique & PC Portables",
          "en-US": "Computers & Laptops",
        },
        shortLabels: { "fr-FR": "Informatique", "en-US": "Computers" },
        name: "Informatique & PC Portables",
        label: "Informatique & PC Portables",
        shortLabel: "Informatique",
        sortOrder: 2,
        status: "active",
        attributeIds: [
          "tech.brand",
          "tech.ram_memory",
          "tech.storage_capacity",
          "tech.screen_size_inches",
          "tech.gpu_model",
        ],
        summaryAttributeIds: [
          "tech.brand",
          "tech.ram_memory",
          "tech.storage_capacity",
        ],
        filterFacetIds: [
          "tech.brand",
          "tech.ram_memory",
          "tech.storage_capacity",
        ],
      },
      {
        id: "electronics.gaming",
        code: "ELEC_GAMING",
        slug: "consoles-jeux-video",
        parentId: "electronics",
        ancestorIds: ["electronics"],
        level: "subcategory",
        labels: {
          "fr-FR": "Consoles & Jeux vidéo",
          "en-US": "Video Games & Consoles",
        },
        shortLabels: { "fr-FR": "Jeux vidéo", "en-US": "Gaming" },
        name: "Consoles & Jeux vidéo",
        label: "Consoles & Jeux vidéo",
        shortLabel: "Jeux vidéo",
        sortOrder: 3,
        status: "active",
        attributeIds: ["tech.brand", "tech.storage_capacity", "product.model"],
        summaryAttributeIds: ["tech.brand", "product.model"],
      },
      {
        id: "electronics.audio_hifi",
        code: "ELEC_AUDIO",
        slug: "audio-hi-fi-casques",
        parentId: "electronics",
        ancestorIds: ["electronics"],
        level: "subcategory",
        labels: {
          "fr-FR": "Audio, Hi-Fi & Casques",
          "en-US": "Audio & Headphones",
        },
        shortLabels: { "fr-FR": "Audio & Hi-Fi", "en-US": "Audio" },
        name: "Audio, Hi-Fi & Casques",
        label: "Audio, Hi-Fi & Casques",
        shortLabel: "Audio & Hi-Fi",
        sortOrder: 4,
        status: "active",
        attributeIds: ["tech.brand", "product.model", "product.color"],
        summaryAttributeIds: ["tech.brand", "product.model"],
      },
    ],
  },

  // =========================================================================
  // 7. MODE & HABILLEMENT
  // =========================================================================
  {
    id: "fashion",
    code: "FASH",
    slug: "mode-accessoires",
    level: "category",
    labels: { "fr-FR": "Mode & Accessoires", "en-US": "Fashion & Accessories" },
    shortLabels: { "fr-FR": "Mode", "en-US": "Fashion" },
    name: "Mode & Accessoires",
    label: "Mode & Accessoires",
    shortLabel: "Mode",
    iconName: "Shirt",
    accentColor: themeColors["category-fashion"],
    sortOrder: 7,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "fashion.gender",
      "fashion.clothing_size",
      "fashion.shoe_size",
      "product.brand",
      "product.color",
      "product.material",
    ],
    summaryAttributeIds: [
      "product.brand",
      "fashion.clothing_size",
      "product.color",
    ],
    filterFacetIds: [
      "fashion.gender",
      "fashion.clothing_size",
      "fashion.shoe_size",
      "product.brand",
      "product.color",
    ],
    children: [
      {
        id: "fashion.women",
        code: "FASH_WOMEN",
        slug: "vetements-femme",
        parentId: "fashion",
        ancestorIds: ["fashion"],
        level: "subcategory",
        labels: { "fr-FR": "Vêtements Femme", "en-US": "Women's Clothing" },
        shortLabels: { "fr-FR": "Mode Femme", "en-US": "Women" },
        name: "Vêtements Femme",
        label: "Vêtements Femme",
        shortLabel: "Mode Femme",
        sortOrder: 1,
        status: "active",
        attributeIds: [
          "fashion.clothing_size",
          "product.brand",
          "product.color",
          "product.material",
        ],
        summaryAttributeIds: [
          "product.brand",
          "fashion.clothing_size",
          "product.color",
        ],
        filterFacetIds: [
          "fashion.clothing_size",
          "product.brand",
          "product.color",
        ],
      },
      {
        id: "fashion.men",
        code: "FASH_MEN",
        slug: "vetements-homme",
        parentId: "fashion",
        ancestorIds: ["fashion"],
        level: "subcategory",
        labels: { "fr-FR": "Vêtements Homme", "en-US": "Men's Clothing" },
        shortLabels: { "fr-FR": "Mode Homme", "en-US": "Men" },
        name: "Vêtements Homme",
        label: "Vêtements Homme",
        shortLabel: "Mode Homme",
        sortOrder: 2,
        status: "active",
        attributeIds: [
          "fashion.clothing_size",
          "product.brand",
          "product.color",
          "product.material",
        ],
        summaryAttributeIds: [
          "product.brand",
          "fashion.clothing_size",
          "product.color",
        ],
        filterFacetIds: [
          "fashion.clothing_size",
          "product.brand",
          "product.color",
        ],
      },
      {
        id: "fashion.shoes",
        code: "FASH_SHOES",
        slug: "chaussures",
        parentId: "fashion",
        ancestorIds: ["fashion"],
        level: "subcategory",
        labels: { "fr-FR": "Chaussures", "en-US": "Shoes" },
        shortLabels: { "fr-FR": "Chaussures", "en-US": "Shoes" },
        name: "Chaussures",
        label: "Chaussures",
        shortLabel: "Chaussures",
        sortOrder: 3,
        status: "active",
        attributeIds: [
          "fashion.gender",
          "fashion.shoe_size",
          "product.brand",
          "product.color",
        ],
        summaryAttributeIds: [
          "product.brand",
          "fashion.shoe_size",
          "product.color",
        ],
        filterFacetIds: [
          "fashion.gender",
          "fashion.shoe_size",
          "product.brand",
        ],
      },
      {
        id: "fashion.jewelry",
        code: "FASH_JEWELRY",
        slug: "montres-bijoux",
        parentId: "fashion",
        ancestorIds: ["fashion"],
        level: "subcategory",
        labels: { "fr-FR": "Montres & Bijoux", "en-US": "Watches & Jewelry" },
        shortLabels: {
          "fr-FR": "Montres & Bijoux",
          "en-US": "Watches & Jewelry",
        },
        name: "Montres & Bijoux",
        label: "Montres & Bijoux",
        shortLabel: "Montres & Bijoux",
        sortOrder: 4,
        status: "active",
        attributeIds: ["product.brand", "product.material", "product.color"],
        summaryAttributeIds: ["product.brand", "product.material"],
      },
    ],
  },

  // =========================================================================
  // 8. BÉBÉ & PUÉRICULTURE
  // =========================================================================
  {
    id: "baby_kids",
    code: "BABY",
    slug: "bebe-puericulture-enfants",
    level: "category",
    labels: { "fr-FR": "Bébé & Puériculture", "en-US": "Baby & Kids" },
    shortLabels: { "fr-FR": "Bébé & Enfant", "en-US": "Baby & Kids" },
    name: "Bébé & Puériculture",
    label: "Bébé & Puériculture",
    shortLabel: "Bébé & Enfant",
    iconName: "Baby",
    accentColor: themeColors["category-baby"],
    sortOrder: 8,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: ["product.brand", "product.color"],
    summaryAttributeIds: ["product.brand", "product.color"],
    children: [
      {
        id: "baby_kids.strollers",
        code: "BABY_STROLLERS",
        slug: "poussettes-sieges-auto",
        parentId: "baby_kids",
        ancestorIds: ["baby_kids"],
        level: "subcategory",
        labels: {
          "fr-FR": "Poussettes & Sièges auto",
          "en-US": "Strollers & Car Seats",
        },
        shortLabels: { "fr-FR": "Poussettes & Sièges", "en-US": "Strollers" },
        name: "Poussettes & Sièges auto",
        label: "Poussettes & Sièges auto",
        shortLabel: "Poussettes & Sièges",
        sortOrder: 1,
        status: "active",
        attributeIds: ["product.brand", "product.model", "product.color"],
        summaryAttributeIds: ["product.brand", "product.model"],
      },
      {
        id: "baby_kids.toys",
        code: "BABY_TOYS",
        slug: "jouets-jeux-eveil",
        parentId: "baby_kids",
        ancestorIds: ["baby_kids"],
        level: "subcategory",
        labels: { "fr-FR": "Jouets & Jeux d'éveil", "en-US": "Toys & Games" },
        shortLabels: { "fr-FR": "Jouets & Éveil", "en-US": "Toys" },
        name: "Jouets & Jeux d'éveil",
        label: "Jouets & Jeux d'éveil",
        shortLabel: "Jouets & Éveil",
        sortOrder: 2,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 9. LOISIRS, CULTURE & INSTRUMENTS
  // =========================================================================
  {
    id: "leisure_culture",
    code: "LEIS",
    slug: "loisirs-culture",
    level: "category",
    labels: {
      "fr-FR": "Loisirs, Livres & Musique",
      "en-US": "Leisure & Culture",
    },
    shortLabels: { "fr-FR": "Loisirs & Culture", "en-US": "Leisure & Culture" },
    name: "Loisirs, Livres & Musique",
    label: "Loisirs, Livres & Musique",
    shortLabel: "Loisirs & Culture",
    iconName: "BookOpen",
    accentColor: themeColors["category-leisure"],
    sortOrder: 9,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: ["product.brand", "product.model"],
    children: [
      {
        id: "leisure_culture.instruments",
        code: "LEIS_MUSIC",
        slug: "instruments-de-musique",
        parentId: "leisure_culture",
        ancestorIds: ["leisure_culture"],
        level: "subcategory",
        labels: {
          "fr-FR": "Instruments de musique",
          "en-US": "Musical Instruments",
        },
        shortLabels: { "fr-FR": "Instruments", "en-US": "Instruments" },
        name: "Instruments de musique",
        label: "Instruments de musique",
        shortLabel: "Instruments",
        sortOrder: 1,
        status: "active",
        attributeIds: ["product.brand", "product.model"],
        summaryAttributeIds: ["product.brand", "product.model"],
      },
      {
        id: "leisure_culture.books",
        code: "LEIS_BOOKS",
        slug: "livres-bd-mangas",
        parentId: "leisure_culture",
        ancestorIds: ["leisure_culture"],
        level: "subcategory",
        labels: { "fr-FR": "Livres, BD & Mangas", "en-US": "Books & Comics" },
        shortLabels: { "fr-FR": "Livres & BD", "en-US": "Books" },
        name: "Livres, BD & Mangas",
        label: "Livres, BD & Mangas",
        shortLabel: "Livres & BD",
        sortOrder: 2,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 10. SPORTS & PLEIN AIR
  // =========================================================================
  {
    id: "sports_outdoors",
    code: "SPORT",
    slug: "sports-plein-air",
    level: "category",
    labels: { "fr-FR": "Sports & Plein air", "en-US": "Sports & Outdoors" },
    shortLabels: { "fr-FR": "Sports", "en-US": "Sports" },
    name: "Sports & Plein air",
    label: "Sports & Plein air",
    shortLabel: "Sports",
    iconName: "Trophy",
    accentColor: themeColors["category-sport"],
    sortOrder: 10,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: ["product.brand", "product.model"],
    children: [
      {
        id: "sports_outdoors.fitness",
        code: "SPORT_FITNESS",
        slug: "fitness-musculation",
        parentId: "sports_outdoors",
        ancestorIds: ["sports_outdoors"],
        level: "subcategory",
        labels: { "fr-FR": "Fitness & Musculation", "en-US": "Fitness & Gym" },
        shortLabels: { "fr-FR": "Fitness", "en-US": "Fitness" },
        name: "Fitness & Musculation",
        label: "Fitness & Musculation",
        shortLabel: "Fitness",
        sortOrder: 1,
        status: "active",
      },
      {
        id: "sports_outdoors.outdoor",
        code: "SPORT_OUTDOOR",
        slug: "randonnee-camping-ski",
        parentId: "sports_outdoors",
        ancestorIds: ["sports_outdoors"],
        level: "subcategory",
        labels: {
          "fr-FR": "Randonnée, Camping & Ski",
          "en-US": "Outdoor & Ski",
        },
        shortLabels: { "fr-FR": "Outdoor & Rando", "en-US": "Outdoor" },
        name: "Randonnée, Camping & Ski",
        label: "Randonnée, Camping & Ski",
        shortLabel: "Outdoor & Rando",
        sortOrder: 2,
        status: "active",
      },
      {
        id: "sports_outdoors.water_sports",
        code: "SPORT_WATER",
        slug: "sports-nautiques",
        parentId: "sports_outdoors",
        ancestorIds: ["sports_outdoors"],
        level: "subcategory",
        labels: {
          "fr-FR": "Sports nautiques & Glisse",
          "en-US": "Water Sports & Boardsports",
        },
        shortLabels: {
          "fr-FR": "Sports nautiques",
          "en-US": "Water Sports",
        },
        name: "Sports nautiques & Glisse",
        label: "Sports nautiques & Glisse",
        shortLabel: "Sports nautiques",
        sortOrder: 3,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 11. ANIMAUX & ACCESSOIRES
  // =========================================================================
  {
    id: "pets",
    code: "PETS",
    slug: "animaux-accessoires",
    level: "category",
    labels: { "fr-FR": "Animaux & Accessoires", "en-US": "Pets & Accessories" },
    shortLabels: { "fr-FR": "Animaux", "en-US": "Pets" },
    name: "Animaux & Accessoires",
    label: "Animaux & Accessoires",
    shortLabel: "Animaux",
    iconName: "Dog",
    accentColor: themeColors["category-pets"],
    sortOrder: 11,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: true,
      canExchange: false,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    children: [
      {
        id: "pets.accessories",
        code: "PETS_ACC",
        slug: "accessoires-animaux",
        parentId: "pets",
        ancestorIds: ["pets"],
        level: "subcategory",
        labels: {
          "fr-FR": "Accessoires & Alimentation",
          "en-US": "Pet Supplies",
        },
        shortLabels: {
          "fr-FR": "Accessoires & Soins",
          "en-US": "Pet Supplies",
        },
        name: "Accessoires & Alimentation",
        label: "Accessoires & Alimentation",
        shortLabel: "Accessoires & Soins",
        sortOrder: 1,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 12. MATÉRIEL PROFESSIONNEL & BTP
  // =========================================================================
  {
    id: "professional_btp",
    code: "PRO_BTP",
    slug: "materiel-professionnel",
    level: "category",
    labels: {
      "fr-FR": "Matériel Professionnel & BTP",
      "en-US": "Professional Equipment",
    },
    shortLabels: { "fr-FR": "Matériel Pro", "en-US": "Pro Equipment" },
    name: "Matériel Professionnel & BTP",
    label: "Matériel Professionnel & BTP",
    shortLabel: "Matériel Pro",
    iconName: "HardHat",
    accentColor: themeColors["category-home-garden"],
    sortOrder: 12,
    status: "active",
    conditionScheme: "professional",
    capabilities: {
      canSell: true,
      canGive: false,
      canExchange: true,
      canRent: true,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "pro.operating_hours",
      "pro.tonnage_t",
      "pro.ce_certified",
      "product.brand",
      "product.model",
    ],
    summaryAttributeIds: [
      "product.brand",
      "pro.operating_hours",
      "pro.tonnage_t",
    ],
    filterFacetIds: ["product.brand", "pro.ce_certified"],
    children: [
      {
        id: "professional_btp.machinery",
        code: "PRO_MACHINERY",
        slug: "btp-chantier-engins",
        parentId: "professional_btp",
        ancestorIds: ["professional_btp"],
        level: "subcategory",
        labels: {
          "fr-FR": "BTP, Chantier & Engins",
          "en-US": "Construction & Heavy Machinery",
        },
        shortLabels: { "fr-FR": "Engins & BTP", "en-US": "Construction" },
        name: "BTP, Chantier & Engins",
        label: "BTP, Chantier & Engins",
        shortLabel: "Engins & BTP",
        sortOrder: 1,
        status: "active",
        attributeIds: [
          "product.brand",
          "product.model",
          "pro.operating_hours",
          "pro.tonnage_t",
          "pro.ce_certified",
        ],
        summaryAttributeIds: [
          "product.brand",
          "pro.operating_hours",
          "pro.tonnage_t",
        ],
      },
      {
        id: "professional_btp.catering",
        code: "PRO_CATERING",
        slug: "restauration-hotellerie",
        parentId: "professional_btp",
        ancestorIds: ["professional_btp"],
        level: "subcategory",
        labels: {
          "fr-FR": "Restauration & Hôtellerie (CHR)",
          "en-US": "Catering & Hospitality",
        },
        shortLabels: { "fr-FR": "Restauration CHR", "en-US": "Catering" },
        name: "Restauration & Hôtellerie (CHR)",
        label: "Restauration & Hôtellerie (CHR)",
        shortLabel: "Restauration CHR",
        sortOrder: 2,
        status: "active",
        attributeIds: ["product.brand", "product.model"],
        summaryAttributeIds: ["product.brand", "product.model"],
      },
    ],
  },

  // =========================================================================
  // 13. AGRICULTURE & ESPACES VERTS
  // =========================================================================
  {
    id: "agriculture",
    code: "AGRI",
    slug: "materiel-agricole-espaces-verts",
    level: "category",
    labels: {
      "fr-FR": "Agriculture & Espaces verts",
      "en-US": "Agriculture & Farming",
    },
    shortLabels: { "fr-FR": "Agriculture", "en-US": "Agriculture" },
    name: "Agriculture & Espaces verts",
    label: "Agriculture & Espaces verts",
    shortLabel: "Agriculture",
    iconName: "Tractor",
    accentColor: themeColors["category-agriculture"],
    sortOrder: 13,
    status: "active",
    conditionScheme: "professional",
    capabilities: {
      canSell: true,
      canGive: false,
      canExchange: true,
      canRent: true,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: ["product.brand", "product.model", "pro.operating_hours"],
    summaryAttributeIds: ["product.brand", "pro.operating_hours"],
    children: [
      {
        id: "agriculture.tractors",
        code: "AGRI_TRACTORS",
        slug: "tracteurs-materiel-recolte",
        parentId: "agriculture",
        ancestorIds: ["agriculture"],
        level: "subcategory",
        labels: {
          "fr-FR": "Tracteurs & Matériel de récolte",
          "en-US": "Tractors & Harvesters",
        },
        shortLabels: { "fr-FR": "Tracteurs & Récolte", "en-US": "Tractors" },
        name: "Tracteurs & Matériel de récolte",
        label: "Tracteurs & Matériel de récolte",
        shortLabel: "Tracteurs & Récolte",
        sortOrder: 1,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 14. ÉNERGIE & TRANSITION ÉCOLOGIQUE
  // =========================================================================
  {
    id: "energy_transition",
    code: "ENERGY",
    slug: "energie-solaire-transition",
    level: "category",
    labels: {
      "fr-FR": "Énergie & Transition Écologique",
      "en-US": "Solar Energy & EV",
    },
    shortLabels: { "fr-FR": "Énergie & Solaire", "en-US": "Clean Energy" },
    name: "Énergie & Transition Écologique",
    label: "Énergie & Transition Écologique",
    shortLabel: "Énergie & Solaire",
    iconName: "Sun",
    accentColor: themeColors["category-pets"],
    sortOrder: 14,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: true,
      canGive: false,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: [
      "product.brand",
      "energy.power_watts",
      "energy.battery_capacity_kwh",
    ],
    summaryAttributeIds: [
      "product.brand",
      "energy.power_watts",
      "energy.battery_capacity_kwh",
    ],
    filterFacetIds: ["product.brand", "energy.power_watts"],
    children: [
      {
        id: "energy_transition.solar",
        code: "ENERGY_SOLAR",
        slug: "panneaux-solaires-onduleurs",
        parentId: "energy_transition",
        ancestorIds: ["energy_transition"],
        level: "subcategory",
        labels: {
          "fr-FR": "Panneaux solaires & Onduleurs",
          "en-US": "Solar Panels & Inverters",
        },
        shortLabels: { "fr-FR": "Panneaux solaires", "en-US": "Solar Panels" },
        name: "Panneaux solaires & Onduleurs",
        label: "Panneaux solaires & Onduleurs",
        shortLabel: "Panneaux solaires",
        sortOrder: 1,
        status: "active",
        attributeIds: [
          "product.brand",
          "energy.power_watts",
          "energy.battery_capacity_kwh",
        ],
        summaryAttributeIds: ["product.brand", "energy.power_watts"],
      },
      {
        id: "energy_transition.ev_charging",
        code: "ENERGY_EV",
        slug: "bornes-recharge-ve",
        parentId: "energy_transition",
        ancestorIds: ["energy_transition"],
        level: "subcategory",
        labels: {
          "fr-FR": "Bornes de recharge VE",
          "en-US": "EV Charging Stations",
        },
        shortLabels: { "fr-FR": "Bornes de recharge", "en-US": "EV Chargers" },
        name: "Bornes de recharge VE",
        label: "Bornes de recharge VE",
        shortLabel: "Bornes de recharge",
        sortOrder: 2,
        status: "active",
      },
    ],
  },

  // =========================================================================
  // 15. INFORMATIQUE PRO & SERVEURS
  // =========================================================================
  {
    id: "pro_it_telecom",
    code: "PRO_IT",
    slug: "informatique-pro-serveurs",
    level: "category",
    labels: {
      "fr-FR": "Informatique Pro & Serveurs",
      "en-US": "Enterprise IT & Servers",
    },
    shortLabels: { "fr-FR": "IT & Serveurs", "en-US": "Enterprise IT" },
    name: "Informatique Pro & Serveurs",
    label: "Informatique Pro & Serveurs",
    shortLabel: "IT & Serveurs",
    iconName: "Server",
    accentColor: themeColors["category-tech"],
    sortOrder: 15,
    status: "active",
    conditionScheme: "professional",
    capabilities: {
      canSell: true,
      canGive: false,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ["hand_delivery", "parcel_shipping", "heavy_delivery"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
    attributeIds: ["tech.brand", "tech.ram_memory", "tech.storage_capacity"],
    summaryAttributeIds: [
      "tech.brand",
      "tech.ram_memory",
      "tech.storage_capacity",
    ],
  },

  // =========================================================================
  // 16. BONS PLANS, DONS & SOLIDARITÉ
  // =========================================================================
  {
    id: "deals_donations",
    code: "DEALS",
    slug: "dons-solidarite-bons-plans",
    level: "category",
    labels: { "fr-FR": "Dons & Solidarité", "en-US": "Free Items & Donations" },
    shortLabels: { "fr-FR": "Dons & Gratuit", "en-US": "Free Items" },
    name: "Dons & Solidarité",
    label: "Dons & Solidarité",
    shortLabel: "Dons & Gratuit",
    iconName: "Gift",
    accentColor: themeColors["category-jobs"],
    sortOrder: 16,
    status: "active",
    conditionScheme: "consumer_product",
    capabilities: {
      canSell: false,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: false,
      negotiablePrice: false,
      fulfillmentModes: ["hand_delivery", "parcel_shipping"],
    },
    sellerEligibility: { individualAllowed: true, proAllowed: true },
  },
];

/**
 * Metadata additions for branches that historically relied on a generic
 * parent schema. Keeping this as a data enrichment pass makes the hierarchy
 * above easy to audit while guaranteeing every node uses the same resolver.
 */
const TAXONOMY_DOMAIN_ATTRIBUTES: Record<string, string[]> = {
  vehicles: [
    "vehicle.registration_date",
    "vehicle.engine_displacement",
    "vehicle.service_history",
    "vehicle.owners_count",
    "vehicle.technical_inspection_date",
    "vehicle.emissions_g_km",
  ],
  "vehicles.cars": ["vehicle.charging_connector"],
  "vehicles.motos": ["vehicle.engine_displacement", "vehicle.service_history"],
  real_estate: [
    "real_estate.heating_source",
    "real_estate.outdoor_space",
    "real_estate.parking",
  ],
  "real_estate.rentals": [
    "real_estate.monthly_rent",
    "real_estate.charges_amount",
    "real_estate.deposit_amount",
    "real_estate.availability_date",
  ],
  jobs: [
    "job.profession",
    "job.engagement_duration",
    "job.start_date",
    "job.work_schedule",
    "job.skills",
  ],
  services: [
    "service.subject",
    "service.audience_level",
    "service.delivery_mode",
    "service.travel_radius_km",
    "service.session_duration_minutes",
    "service.languages",
  ],
  "services.home_repairs": [
    "service.travel_radius_km",
    "service.delivery_mode",
  ],
  "services.tutoring": [
    "service.subject",
    "service.audience_level",
    "service.languages",
  ],
  "services.events": ["service.delivery_mode", "service.travel_radius_km"],
  home_garden: [
    "product.brand",
    "product.material",
    "product.condition_cosmetic",
    "product.condition_functional",
    "product.dimensions",
    "product.weight_kg",
    "product.included_accessories",
  ],
  "home_garden.furniture": ["product.dimensions", "product.material"],
  "home_garden.furniture.sofas": ["product.dimensions", "product.material"],
  "home_garden.furniture.tables": ["product.dimensions", "product.material"],
  "home_garden.furniture.beds": ["product.dimensions", "product.material"],
  electronics: [
    "tech.generation",
    "tech.connectivity",
    "tech.operating_system",
    "product.condition_cosmetic",
    "product.condition_functional",
    "product.purchase_date",
    "product.invoice_available",
    "product.defects",
    "product.included_accessories",
  ],
  "electronics.smartphones": ["tech.storage_capacity", "tech.network_lock"],
  "electronics.computers": ["tech.processor", "tech.ram_memory"],
  "electronics.gaming": ["tech.connectivity", "product.included_accessories"],
  fashion: [
    "fashion.size_system",
    "fashion.fit",
    "fashion.authenticity",
    "product.condition_cosmetic",
    "product.purchase_date",
    "product.invoice_available",
  ],
  "fashion.women": ["fashion.size_system", "fashion.fit"],
  "fashion.men": ["fashion.size_system", "fashion.fit"],
  "fashion.shoes": ["fashion.size_system", "fashion.authenticity"],
  "fashion.jewelry": ["fashion.authenticity", "product.material"],
  baby_kids: [
    "product.condition_cosmetic",
    "product.condition_functional",
    "product.dimensions",
    "product.included_accessories",
  ],
  leisure_culture: [
    "product.condition_cosmetic",
    "product.condition_functional",
  ],
  "leisure_culture.instruments": ["leisure.instrument_type", "leisure.level"],
  "leisure_culture.books": [
    "product.purchase_date",
    "product.condition_cosmetic",
  ],
  sports_outdoors: ["product.condition_cosmetic", "product.dimensions"],
  "sports_outdoors.fitness": ["sport.activity", "sport.size"],
  "sports_outdoors.outdoor": ["sport.activity", "sport.size"],
  "sports_outdoors.water_sports": ["sport.activity", "sport.size"],
  pets: ["pets.species", "pets.age_years", "pets.breed", "pets.gender"],
  "pets.accessories": [
    "product.brand",
    "product.material",
    "product.condition_cosmetic",
    "product.dimensions",
  ],
  professional_btp: [
    "product.brand",
    "product.condition_functional",
    "product.purchase_date",
    "product.invoice_available",
  ],
  "professional_btp.machinery": [
    "pro.operating_hours",
    "pro.tonnage_t",
    "pro.ce_certified",
  ],
  agriculture: [
    "product.brand",
    "product.condition_functional",
    "agriculture.hours",
    "agriculture.power",
  ],
  "agriculture.tractors": ["agriculture.hours", "agriculture.power"],
  energy_transition: [
    "energy.installation_type",
    "energy.compatibility",
    "product.condition_functional",
  ],
  "energy_transition.solar": [
    "energy.power_watts",
    "energy.battery_capacity_kwh",
  ],
  "energy_transition.ev_charging": [
    "energy.power_watts",
    "energy.compatibility",
  ],
  pro_it_telecom: [
    "tech.generation",
    "tech.connectivity",
    "product.condition_functional",
    "product.invoice_available",
  ],
  deals_donations: [
    "product.condition_cosmetic",
    "product.condition_functional",
    "product.quantity",
    "product.included_accessories",
  ],
};

const TAXONOMY_FAMILIES: Record<string, TaxonomyNode["listingFamily"]> = {
  vehicles: "vehicle",
  real_estate: "real_estate",
  jobs: "job",
  services: "service",
  professional_btp: "professional_equipment",
  agriculture: "professional_equipment",
  energy_transition: "professional_equipment",
  pro_it_telecom: "professional_equipment",
  deals_donations: "physical_product",
};

const STANDARD_PUBLICATION_STEPS: NonNullable<
  TaxonomyNode["publication"]
>["steps"] = [
  "intent",
  "taxonomy",
  "essential",
  "condition_history",
  "price_compensation",
  "fulfillment_location",
  "media_documents",
  "contact_preferences",
  "preview",
  "standard_or_upgrades",
  "confirmation",
];

function resolveDefaultIntents(
  nodeId: string,
  family: NonNullable<TaxonomyNode["listingFamily"]>,
): string[] {
  if (family === "job") return ["JOB_OFFER"];
  if (family === "service") return ["OFFER_SERVICE"];
  if (family === "real_estate") {
    return nodeId.includes("rentals") ? ["RENT"] : ["SELL", "RENT"];
  }
  if (nodeId === "deals_donations") return ["GIVE", "EXCHANGE"];
  if (family === "professional_equipment") return ["SELL", "RENT"];
  return ["SELL", "GIVE", "EXCHANGE"];
}

function resolvePrimaryCta(
  nodeId: string,
  family: NonNullable<TaxonomyNode["listingFamily"]>,
): NonNullable<TaxonomyNode["publication"]>["primaryCta"] {
  if (family === "job") return "apply";
  if (family === "real_estate") return "request_visit";
  if (family === "vehicle") return "request_test_drive";
  if (nodeId === "services.tutoring") return "request_lesson";
  if (family === "service" || family === "professional_equipment") {
    return "request_quote";
  }
  return "contact_seller";
}

function resolveModerationPolicy(
  rootId: string,
  family: NonNullable<TaxonomyNode["listingFamily"]>,
): NonNullable<TaxonomyNode["moderation"]> {
  const enhancedRoots = new Set([
    "vehicles",
    "real_estate",
    "baby_kids",
    "pets",
    "fashion",
  ]);
  return {
    policyId: `moderation.${rootId}.v1`,
    reviewMode:
      enhancedRoots.has(rootId) || family === "professional_equipment"
        ? "enhanced"
        : "standard",
    prohibitedItemRuleIds: [
      "prohibited.illegal",
      "prohibited.counterfeit",
      `prohibited.${rootId}`,
    ],
    safetyNoticeKeys: [`safety.${rootId}.general`],
    sensitiveAttributeIds:
      family === "vehicle"
        ? ["vehicle.vin", "vehicle.registration_number"]
        : family === "job"
          ? ["job.application_documents"]
          : [],
  };
}

function enrichTaxonomyNode(node: TaxonomyNode, rootId: string): TaxonomyNode {
  const children = node.children?.map((child) =>
    enrichTaxonomyNode(child, rootId),
  );
  const attributeIds = Array.from(
    new Set([
      ...(node.attributeIds || []),
      ...(TAXONOMY_DOMAIN_ATTRIBUTES[rootId] || []),
      ...(TAXONOMY_DOMAIN_ATTRIBUTES[node.id] || []),
    ]),
  );
  const summaryAttributeIds =
    node.summaryAttributeIds && node.summaryAttributeIds.length > 0
      ? node.summaryAttributeIds
      : attributeIds
          .map((id) => ATTRIBUTE_REGISTRY[id])
          .filter(
            (attribute) => attribute && attribute.dataType !== "long_text",
          )
          .slice(0, 3)
          .map((attribute) => attribute!.id);
  const filterFacetIds =
    node.filterFacetIds && node.filterFacetIds.length > 0
      ? node.filterFacetIds
      : attributeIds.filter((id) => ATTRIBUTE_REGISTRY[id]?.filterable);
  const cardAttributeIds = node.presentation?.cardAttributeIds?.length
    ? Array.from(new Set(node.presentation.cardAttributeIds))
    : Array.from(
        new Set([
          ...summaryAttributeIds,
          ...filterFacetIds,
          ...attributeIds,
        ]),
      );
  const isLeaf = !children || children.length === 0;
  const listingFamily =
    node.listingFamily || TAXONOMY_FAMILIES[rootId] || "physical_product";
  const mediaGuidance = node.mediaGuidance || {
    minimumPhotoCount:
      listingFamily === "real_estate"
        ? 5
        : listingFamily === "job" || listingFamily === "service"
          ? 0
          : listingFamily === "vehicle" ||
              listingFamily === "professional_equipment"
            ? 3
            : 1,
    maxPhotoCount:
      listingFamily === "job" ? 4 : listingFamily === "real_estate" ? 20 : 12,
    recommendedViews:
      listingFamily === "job"
        ? ["company_logo", "workplace"]
        : listingFamily === "service"
          ? ["work_sample", "context"]
          : ["front", "detail", "context"],
  };
  const supportedIntents =
    node.supportedIntents && node.supportedIntents.length > 0
      ? node.supportedIntents
      : resolveDefaultIntents(node.id, listingFamily);

  return {
    ...node,
    children,
    listingFamily,
    taxonomyVersion: node.taxonomyVersion || 3,
    schemaVersion: node.schemaVersion || 2,
    schemaStatus: node.schemaStatus || "published",
    publishable: node.publishable ?? isLeaf,
    supportedIntents,
    attributeIds,
    summaryAttributeIds,
    filterFacetIds,
    presentation: {
      ...node.presentation,
      cardAttributeIds,
      comparisonAttributeIds:
        node.presentation?.comparisonAttributeIds ||
        attributeIds.filter((id) => ATTRIBUTE_REGISTRY[id]?.comparable),
      detailGroupOrder: node.presentation?.detailGroupOrder || [
        "general",
        "specifications",
        "dimensions",
        "performance",
        "legal",
      ],
      sortOptions: node.presentation?.sortOptions || [
        "relevance",
        "recent",
        "price_asc",
        "price_desc",
      ],
    },
    mediaGuidance,
    seo: {
      metaTitleTemplate: `${node.name} : annonces sur Shongre`,
      metaDescriptionTemplate: `Découvrez les annonces ${node.name.toLocaleLowerCase("fr-FR")} disponibles sur Shongre.`,
      canonicalPath: `/categorie/${node.slug}`,
      indexable: node.status === "active",
      ...node.seo,
    },
    publication: node.publication || {
      steps: STANDARD_PUBLICATION_STEPS,
      primaryCta: resolvePrimaryCta(node.id, listingFamily),
      standardPolicy: {
        enabled: true,
        label: "Publication standard gratuite",
        eligibleSellerTypes:
          listingFamily === "job" &&
          node.sellerEligibility?.individualAllowed === false
            ? ["professional"]
            : ["individual", "professional"],
        durationDays: listingFamily === "job" ? 30 : 60,
        mediaAllowance: mediaGuidance.maxPhotoCount || 12,
        includesMessaging: true,
        includesListingManagement: true,
        includesStandardStatistics: true,
        paidUpgradesOptional: true,
      },
    },
    moderation:
      node.moderation || resolveModerationPolicy(rootId, listingFamily),
  };
}

export const CANONICAL_TAXONOMY: TaxonomyNode[] = BASE_CANONICAL_TAXONOMY.map(
  (root) => enrichTaxonomyNode(root, root.id),
);

/**
 * Standard condition options for consumer products
 */
export const CONDITION_OPTIONS = CONDITION_SCHEMES.consumer_product.map(
  (c) => ({
    value: c.value,
    label: c.label,
    description: c.description,
  }),
);

const buildLegacyAttributes = (
  attrIds: string[] = [],
  summaryIds: string[] = [],
): CategoryAttributeSchema[] => {
  return attrIds
    .map((id) => ATTRIBUTE_REGISTRY[id])
    .filter(Boolean)
    .map((attr) => {
      let type: AttributeInputType = "text";
      if (attr.dataType === "select") type = "select";
      else if (attr.dataType === "multi_select") type = "multi_select";
      else if (attr.dataType === "number") type = "number";
      else if (attr.dataType === "range" || attr.dataType === "money")
        type = "number";
      else if (attr.dataType === "long_text") type = "textarea";
      else if (attr.dataType === "boolean") type = "boolean";
      else if (attr.dataType === "year") type = "year";
      else if (attr.dataType === "date" || attr.dataType === "date_time")
        type = "date";

      return {
        key: attr.code,
        label: attr.label,
        type,
        required: !!attr.required,
        showInFilters: !!attr.filterable,
        showInCardPreview: summaryIds.includes(attr.id),
        options: attr.options?.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
        unit: attr.unit,
        min: attr.validation?.min,
        max: attr.validation?.max,
        step: attr.validation?.step,
        placeholder: attr.validation?.placeholder || attr.helpText,
      };
    });
};

/**
 * Maps canonical TaxonomyNode tree to Category/SubCategory interfaces
 */
/**
 * The legacy `Category[]` projection of the canonical tree.
 *
 * Most of the product reads this rather than `taxonomyService`, so it has to
 * speak the visitor's language too. It takes its labels from the same
 * `labels` / `shortLabels` maps the canonical nodes already carry — nothing is
 * copied into a second catalogue, and French remains the source entry.
 *
 * `refreshTaxonomyProjection` rebuilds it **in place** on a language change:
 * every consumer holds a reference to this array, so replacing the binding
 * would leave them all pointing at the previous language.
 */
function buildTaxonomyProjection(locale: string): Category[] {
  return CANONICAL_TAXONOMY.map((root) => {
    const rootAttrIds = root.attributeIds || [];
    const rootSummaryIds = root.summaryAttributeIds || [];

    const subCats: SubCategory[] = (root.children || []).map((sub) => {
      const combinedAttrIds = Array.from(
        new Set([...rootAttrIds, ...(sub.attributeIds || [])]),
      );
      const combinedSummaryIds = Array.from(
        new Set([...rootSummaryIds, ...(sub.summaryAttributeIds || [])]),
      );
      const attributesSchema = buildLegacyAttributes(
        combinedAttrIds,
        combinedSummaryIds,
      );

      return {
        id: sub.id,
        slug: sub.slug,
        name: getTaxonomyLabel(sub, { locale }) || sub.name,
        label: getTaxonomyLabel(sub, { locale }) || sub.label || sub.name,
        shortLabel:
          getTaxonomyLabel(sub, { locale, compact: true }) || sub.shortLabel,
        parentSlug: root.slug,
        iconName: sub.iconName || root.iconName || "Tag",
        accentColor:
          sub.accentColor ||
          root.accentColor ||
          themeColors["category-vehicles"],
        attributesSchema,
      };
    });

    return {
      id: root.id,
      slug: root.slug,
      name: getTaxonomyLabel(root, { locale }) || root.name,
      label: getTaxonomyLabel(root, { locale }) || root.label || root.name,
      shortLabel:
        getTaxonomyLabel(root, { locale, compact: true }) || root.shortLabel,
      iconName: root.iconName || "Tag",
      description: root.description || `${root.name} sur Shongre`,
      accentColor: root.accentColor || themeColors["category-vehicles"],
      subCategories: subCats,
    };
  });
}

export const TAXONOMY: Category[] = buildTaxonomyProjection(activeDataLocale());

/** Re-projects in place so existing references pick up the new language. */
export function refreshTaxonomyProjection(locale: string): void {
  TAXONOMY.splice(0, TAXONOMY.length, ...buildTaxonomyProjection(locale));
}

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return TAXONOMY.find((c) => c.slug === slug || c.id === slug);
};

export const getSubCategoryBySlug = (
  categorySlug: string,
  subCategorySlug: string,
): SubCategory | undefined => {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  return category.subCategories.find(
    (s) => s.slug === subCategorySlug || s.id === subCategorySlug,
  );
};

export const getAttributesForCategory = (
  categorySlug: string,
  subCategorySlug?: string,
): CategoryAttributeSchema[] => {
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return [];
  if (subCategorySlug) {
    const sub = cat.subCategories.find(
      (s) => s.slug === subCategorySlug || s.id === subCategorySlug,
    );
    if (sub) return sub.attributesSchema;
  }
  return cat.subCategories.flatMap((s) => s.attributesSchema);
};
