/**
 * SHONGRE PROVIDER CONFIGURATION & ROUTING VALIDATION
 * Pure business logic for validating provider settings, credentials,
 * priority conflicts, and market scope compatibility.
 */

import {
  Provider,
  ProviderConfiguration,
  ProviderRoutingRule,
  ProviderMarketOverride,
} from "./provider.types";
import { getProviderById } from "./provider.registry";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProviderValidator {
  /**
   * Validate operational configuration against provider static definition & schema
   */
  validateConfiguration(
    provider: Provider,
    config: Partial<ProviderConfiguration>,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.environment) {
      errors.push(
        "L'environnement (demo, sandbox, production) est obligatoire.",
      );
    }

    if (
      config.priority !== undefined &&
      (config.priority < 1 || !Number.isInteger(config.priority))
    ) {
      errors.push(
        "La priorité doit être un entier positif supérieur ou égal à 1.",
      );
    }

    // Check schema requirements
    const schema = provider.configurationSchema;
    if (schema && schema.fields) {
      const settings = config.settings || {};
      for (const field of schema.fields) {
        const val = settings[field.key];
        const isSecret = field.secret;

        if (field.required) {
          // If enabled, required fields must be filled or marked as configured
          if (config.enabled) {
            if (isSecret) {
              if (
                config.credentialStatus === "not_configured" ||
                config.credentialStatus === "invalid"
              ) {
                errors.push(
                  `Le champ secret requis "${field.label}" n'est pas configuré.`,
                );
              }
            } else if (val === undefined || val === null || val === "") {
              errors.push(`Le champ requis "${field.label}" est manquant.`);
            }
          }
        }

        // Validate URL format if type is url
        if (field.type === "url" && val) {
          try {
            new URL(val);
          } catch {
            errors.push(
              `Le champ "${field.label}" doit être une URL valide (ex: https://...).`,
            );
          }
        }

        // Validate Number format
        if (
          field.type === "number" &&
          val !== undefined &&
          val !== null &&
          val !== ""
        ) {
          if (isNaN(Number(val))) {
            errors.push(`Le champ "${field.label}" doit être un nombre.`);
          }
        }
      }
    }

    // Activation blocker warnings
    if (config.enabled && config.credentialStatus === "not_configured") {
      warnings.push(
        "Le prestataire est activé mais ses identifiants ne sont pas encore configurés.",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a market override
   */
  validateMarketOverride(
    provider: Provider,
    marketCode: string,
    override: ProviderMarketOverride,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const normMarket = marketCode.toUpperCase();
    if (
      !provider.supportedMarkets.includes("*") &&
      !provider.supportedMarkets.includes(normMarket)
    ) {
      errors.push(
        `Le prestataire ${provider.name} ne supporte pas officiellement le marché ${normMarket}.`,
      );
    }

    if (
      override.priority !== undefined &&
      (override.priority < 1 || !Number.isInteger(override.priority))
    ) {
      errors.push(
        "La priorité de surcharge doit être un entier supérieur ou égal à 1.",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate capability routing rule
   */
  validateRoutingRule(rule: ProviderRoutingRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const primary = getProviderById(rule.primaryProviderId);
    if (!primary) {
      errors.push(
        `Le prestataire primaire "${rule.primaryProviderId}" est introuvable.`,
      );
    } else if (!primary.capabilities.includes(rule.capability)) {
      errors.push(
        `Le prestataire primaire ${primary.name} ne supporte pas la capacité "${rule.capability}".`,
      );
    }

    if (rule.fallbackProviderId) {
      if (rule.fallbackProviderId === rule.primaryProviderId) {
        errors.push(
          "Le prestataire de secours (fallback) ne peut pas être identique au prestataire primaire.",
        );
      } else {
        const fallback = getProviderById(rule.fallbackProviderId);
        if (!fallback) {
          errors.push(
            `Le prestataire de secours "${rule.fallbackProviderId}" est introuvable.`,
          );
        } else if (!fallback.capabilities.includes(rule.capability)) {
          errors.push(
            `Le prestataire de secours ${fallback.name} ne supporte pas la capacité "${rule.capability}".`,
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const providerValidator = new ProviderValidator();
