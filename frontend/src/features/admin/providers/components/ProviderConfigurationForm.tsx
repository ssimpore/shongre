import React, { useState } from 'react';
import {
  Save,
  Lock
  
  
  
  
  
  
  
  
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
import { useTranslation } from '../../../../i18n/I18nProvider';

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
  const { t } = useTranslation();
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
        <h4 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">{t('admin.providerConfigurationForm.parametresGenerauxDActivationDeploiement')}</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Enable Toggle */}
          <div className="flex flex-col justify-between p-3 rounded-lg border border-stone-200 bg-stone-50/60">
            <span className="text-xs font-bold text-stone-900">{t('admin.providerConfigurationForm.etatDActivation')}</span>
            <p className="text-micro text-stone-500 mb-2">{t('admin.providerConfigurationForm.rendLePrestataireOperationnelPour')}</p>
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
            <p className="text-micro text-stone-500 mb-2">{t('admin.providerConfigurationForm.contexteDExecution')}</p>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
              className="py-1 px-2 text-xs rounded border border-stone-200 bg-white font-medium text-stone-800"
            >
              <option value="demo">Demo (Simulation locale)</option>
              <option value="sandbox">{t('admin.providerConfigurationForm.sandboxEnvironnementDeTestPartenaire')}</option>
              <option value="production">{t('admin.providerConfigurationForm.productionServeurSecurise')}</option>
            </select>
          </div>

          {/* Priority */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 flex flex-col justify-between">
            <span className="text-xs font-bold text-stone-900">{t('admin.providerConfigurationForm.prioriteDeRoutage')}</span>
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
            <h4 className="text-sm font-bold text-stone-900">{t('admin.providerConfigurationForm.parametresTechniquesClesDApi')}</h4>
            <p className="text-xs text-stone-500">{t('admin.providerConfigurationForm.lesClesSecretesSontGerees')}</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
            <Lock className="w-3.5 h-3.5 text-warning" />
            <span>{t('admin.providerConfigurationForm.securiteCertifiee')}</span>
          </div>
        </div>

        {schemaFields.length === 0 ? (
          <p className="text-xs text-stone-500 italic">{t('admin.providerConfigurationForm.aucunParametreRequisPourCette')}</p>
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
                      {field.required && <span className="text-danger">*</span>}
                    </label>
                    {isSecret && (
                      <span className="text-micro font-semibold text-warning bg-warning-surface border border-warning-border px-1.5 py-0.2 rounded">
                        Secret Serveur
                      </span>
                    )}
                  </div>

                  {isSecret ? (
                    <div className="p-3 rounded-lg border border-warning-border bg-warning-surface/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">{t('admin.providerConfigurationForm.statutDesIdentifiants')}</span>
                        <select
                          value={credentialStatus}
                          onChange={(e) => setCredentialStatus(e.target.value as any)}
                          className="py-1 px-2 text-xs rounded border border-warning-border bg-white font-semibold text-warning"
                        >
                          <option value="configured">{t('admin.providerConfigurationForm.cleConfigureeEtValidee')}</option>
                          <option value="not_configured">{t('admin.providerConfigurationForm.nonConfiguree')}</option>
                          <option value="invalid">{t('admin.providerConfigurationForm.cleRevoqueeOuInvalide')}</option>
                          <option value="expired">{t('admin.providerConfigurationForm.cleExpiree')}</option>
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
                      <p className="text-micro text-stone-500">{t('admin.providerConfigurationForm.protectionRenforceeLeSecretReel')}</p>
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
        >{t('admin.providerConfigurationForm.enregistrerLaConfiguration')}</Button>
      </div>
    </form>
  );
};
