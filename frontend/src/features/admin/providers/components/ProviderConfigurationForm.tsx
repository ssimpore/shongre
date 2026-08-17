import React, { useState } from 'react';
import {
  Save,
  Lock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  Provider,
  ProviderConfiguration,
  ProviderEnvironment,
  CredentialStatus,
} from '../../../../domains/providers/provider.types';
import { providerService } from '../../../../domains/providers/provider.service';
import { Button } from '../../../../design-system/primitives/Button';
import { useToast } from '../../../../app/providers/ToastProvider';

interface ProviderConfigurationFormProps {
  provider: Provider;
  configuration: ProviderConfiguration;
  onSaved: () => void;
  onRequestImpactReview: (action: () => Promise<void>, message: string) => void;
}

export const ProviderConfigurationForm: React.FC<ProviderConfigurationFormProps> = ({
  provider,
  configuration,
  onSaved,
  onRequestImpactReview,
}) => {
  const toast = useToast();
  const [enabled, setEnabled] = useState(configuration.enabled);
  const [environment, setEnvironment] = useState<ProviderEnvironment>(configuration.environment);
  const [priority, setPriority] = useState(configuration.priority);
  const [settings, setSettings] = useState<Record<string, any>>(configuration.settings || {});
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>(configuration.credentialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if disabling an active provider
    if (configuration.enabled && !enabled) {
      onRequestImpactReview(async () => {
        await executeSave({ enabled: false });
      }, `Vous êtes sur le point de désactiver ${provider.name}.`);
      return;
    }

    await executeSave({});
  };

  const executeSave = async (extraUpdates: Partial<ProviderConfiguration>) => {
    setIsSaving(true);
    try {
      await providerService.saveConfiguration(provider.id, {
        enabled,
        environment,
        priority: Number(priority),
        settings,
        credentialStatus,
        ...extraUpdates,
      });
      toast.success('Configuration du prestataire enregistrée avec succès.');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setIsSaving(false);
    }
  };

  const schemaFields = provider.configurationSchema?.fields || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. General Operational Controls */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
          Paramètres Généraux d'Activation & Déploiement
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Enable Toggle */}
          <div className="flex flex-col justify-between p-3 rounded-lg border border-stone-200 bg-stone-50/60">
            <span className="text-xs font-bold text-stone-900">État d'activation</span>
            <p className="text-micro text-stone-500 mb-2">
              Rend le prestataire opérationnel pour la plateforme
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-2 text-xs font-semibold text-stone-700">
                {enabled ? 'Activé' : 'Désactivé'}
              </span>
            </label>
          </div>

          {/* Environment selector */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 flex flex-col justify-between">
            <span className="text-xs font-bold text-stone-900">Environnement</span>
            <p className="text-micro text-stone-500 mb-2">
              Contexte d'exécution
            </p>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
              className="py-1 px-2 text-xs rounded border border-stone-200 bg-white font-medium text-stone-800"
            >
              <option value="demo">Demo (Simulation locale)</option>
              <option value="sandbox">Sandbox (Environnement de test partenaire)</option>
              <option value="production">Production (Serveur sécurisé)</option>
            </select>
          </div>

          {/* Priority */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 flex flex-col justify-between">
            <span className="text-xs font-bold text-stone-900">Priorité de routage</span>
            <p className="text-micro text-stone-500 mb-2">
              1 = Primaire, 2 = Secours
            </p>
            <input
              type="number"
              min={1}
              max={10}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
              className="py-1 px-2 text-xs rounded border border-stone-200 bg-white font-bold text-stone-800 w-24"
            />
          </div>
        </div>
      </div>

      {/* 2. Schema-driven Settings & Safe Credentials */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h4 className="text-sm font-bold text-stone-900">
              Paramètres Techniques & Clés d'API
            </h4>
            <p className="text-xs text-stone-500">
              Les clés secrètes sont gérées côté serveur et ne sont jamais renvoyées en clair dans le navigateur.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Sécurité certifiée</span>
          </div>
        </div>

        {schemaFields.length === 0 ? (
          <p className="text-xs text-stone-500 italic">Aucun paramètre requis pour cette intégration.</p>
        ) : (
          <div className="space-y-4">
            {schemaFields.map((field) => {
              const isSecret = field.secret;
              const val = settings[field.key] ?? field.defaultValue ?? '';

              return (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {isSecret && (
                      <span className="text-micro font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                        Secret Serveur
                      </span>
                    )}
                  </div>

                  {isSecret ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Statut des identifiants :</span>
                        <select
                          value={credentialStatus}
                          onChange={(e) => setCredentialStatus(e.target.value as any)}
                          className="py-1 px-2 text-xs rounded border border-amber-300 bg-white font-semibold text-amber-900"
                        >
                          <option value="configured">✓ Clé configurée et validée</option>
                          <option value="not_configured">⚠ Non configurée</option>
                          <option value="invalid">✗ Clé révoquée ou invalide</option>
                          <option value="expired">⌛ Clé expirée</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled
                          value="••••••••••••••••••••••••••••••••"
                          className="w-full py-1.5 px-2.5 text-xs rounded border border-stone-200 bg-stone-100/80 text-stone-500 font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('La rotation des clés réelles sera exécutée par le backend sécurisé.')}
                          className="text-xs shrink-0 h-8"
                        >
                          Remplacer
                        </Button>
                      </div>
                      <p className="text-micro text-stone-500">
                        Protection renforcée : Le secret réel est injecté de manière confidentielle dans le coffre-fort de clés serveur (Vault / KMS).
                      </p>
                    </div>
                  ) : field.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                        className="rounded border-stone-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-xs text-stone-700 font-medium">{field.description || 'Activer cette option'}</span>
                    </label>
                  ) : field.type === 'select' && field.options ? (
                    <select
                      value={val}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="w-full py-2 px-3 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50/50"
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={val}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        handleFieldChange(
                          field.key,
                          field.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                      className="w-full py-2 px-3 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50/50"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
          className="text-xs font-bold"
        >
          Enregistrer la configuration
        </Button>
      </div>
    </form>
  );
};
