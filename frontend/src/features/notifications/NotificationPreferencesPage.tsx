import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Mail, Smartphone, Save, Lock } from "lucide-react";
import { NotificationPreferences } from "../../domains/notifications/notification.types";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { Skeleton } from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const NotificationPreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.notificationPreferences.title"),
    description: t("meta.notificationPreferences.description"),
    canonicalPath: "/compte/notifications/preferences",
    noIndex: true,
  });

  const { currentUser } = useAuth();
  const toast = useToast();
  const currentUserId = currentUser ? currentUser.id : "user-thomas";

  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    services.notifications.getPreferences(currentUserId).then((prefs) => {
      setPreferences(prefs);
      setIsLoading(false);
    });
  }, [currentUserId]);

  const handleToggle = (
    categoryKey: keyof Omit<NotificationPreferences, "userId" | "updatedAt">,
    channel: "inApp" | "email" | "push",
  ) => {
    if (!preferences) return;

    const currentCat = preferences[categoryKey];
    if (
      currentCat.isMandatory &&
      (channel === "inApp" || channel === "email")
    ) {
      toast.info(
        "Cette alerte est obligatoire pour garantir la sécurité de vos transactions et de votre compte.",
      );
      return;
    }

    setPreferences({
      ...preferences,
      [categoryKey]: {
        ...currentCat,
        [channel]: !currentCat[channel],
      },
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      await services.notifications.updatePreferences(
        currentUserId,
        preferences,
      );
      toast.success(
        "Vos préférences de notifications ont été enregistrées avec succès.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !preferences) {
    // Structural skeleton mirroring the loaded layout (page header + one row per
    // preference section) so nothing jumps when the data arrives. This used to be
    // a centred "Chargement…" string, which collapsed the page then re-expanded it.
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">
          {t(
            "notifications.notificationPreferencesPage.chargementDeVosPreferencesDe",
          )}
        </span>
        <div className="space-y-2">
          <Skeleton className="h-control-sm w-72 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl border border-border-base p-4 sm:p-6 shadow-xs">
          <Skeleton className="h-4 w-40 rounded-lg mb-4" />
          <div className="divide-y divide-border-subtle">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="py-4.5 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-3 sm:space-y-0"
              >
                <div className="sm:col-span-6 space-y-1.5">
                  <Skeleton className="h-4 w-48 rounded-lg" />
                  <Skeleton className="h-3 w-full max-w-md rounded-lg" />
                </div>
                <div className="sm:col-span-6 flex items-center justify-end gap-8">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sections: {
    key: keyof Omit<NotificationPreferences, "userId" | "updatedAt">;
    title: string;
    description: string;
    isMandatory?: boolean;
  }[] = [
    {
      key: "messages",
      title: "Messages & Offres de prix",
      description:
        "Nouveaux messages des acheteurs/vendeurs et propositions d'offres.",
    },
    {
      key: "transactions",
      title: "Transactions & Paiements",
      description:
        "Validation de paiement, réservation, confirmation de commande et libération des fonds.",
      isMandatory: true,
    },
    {
      key: "listings",
      title: "Gestion de vos annonces",
      description:
        "Validation de publication, expiration, alertes baisse de prix et recherches enregistrées.",
    },
    {
      key: "delivery",
      title: "Livraison & Remise en main propre",
      description:
        "Suivi de colis, rendez-vous de remise en main propre et code PIN de confirmation.",
      isMandatory: true,
    },
    {
      key: "reviews",
      title: "Avis & Notations",
      description:
        "Rappels pour évaluer une transaction et notifications d'avis reçus.",
    },
    {
      key: "promotions",
      title: "Mises en avant & Boosts",
      description:
        "Statut de vos boosts d'annonces et renouvellement de forfait Pro.",
    },
    {
      key: "security",
      title: "Sécurité & Accès au compte",
      description:
        "Changements de mot de passe, nouvelles connexions et vérification d'identité.",
      isMandatory: true,
    },
    {
      key: "marketing",
      title: "Offres promotionnelles & Actualités Shongre",
      description:
        "Conseils pour vendre plus vite, actualités de la plateforme et offres partenaires.",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/compte/notifications"
            className="text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="w-icon-sm h-icon-sm" />
            <span>
              {t(
                "notifications.notificationPreferencesPage.retourAuCentreDeNotifications",
              )}
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            {t(
              "notifications.notificationPreferencesPage.preferencesDeNotifications",
            )}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t(
              "notifications.notificationPreferencesPage.choisissezPrecisementLesAlertesQue",
            )}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-icon-md h-icon-md" />}
          className="shrink-0"
        >
          Enregistrer
        </Button>
      </div>

      {/* Matrix Header */}
      <div className="bg-white rounded-3xl border border-border-base p-6 shadow-xs space-y-6">
        <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 border-b border-border-base text-xs font-black text-stone-500 uppercase tracking-wider">
          <div className="col-span-6">
            {t("notifications.notificationPreferencesPage.categorieDAlerte")}
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Bell className="w-icon-sm h-icon-sm text-stone-500" />
            <span>Application</span>
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Mail className="w-icon-sm h-icon-sm text-stone-500" />
            <span>Email</span>
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Smartphone className="w-icon-sm h-icon-sm text-stone-500" />
            <span>Push</span>
          </div>
        </div>

        {/* Section Rows */}
        <div className="divide-y divide-border-subtle">
          {sections.map((sec) => {
            const pref = preferences[sec.key];

            return (
              <div
                key={sec.key}
                className="py-4.5 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-3 sm:space-y-0"
              >
                {/* Left Description */}
                <div className="sm:col-span-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-stone-900">
                      {sec.title}
                    </h2>
                    {sec.isMandatory && (
                      <Badge variant="neutral" size="sm">
                        <Lock className="w-2.5 h-2.5 mr-1" />
                        Obligatoire
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed font-medium">
                    {sec.description}
                  </p>
                </div>

                {/* In-App Toggle */}
                <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                  <span className="sm:hidden text-xs font-semibold text-stone-600">
                    {t(
                      "notifications.notificationPreferencesPage.surLApplication",
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={pref.inApp}
                    disabled={sec.isMandatory}
                    onChange={() => handleToggle(sec.key, "inApp")}
                    aria-label={t(
                      "notifications.notificationPreferencesPage.canalPourAlerte",
                      {
                        channel: t(
                          "notifications.notificationPreferencesPage.canalApplication",
                        ),
                        alert: sec.title,
                      },
                    )}
                    className="w-4.5 h-4.5 text-primary rounded-md border-border-base focus:ring-primary disabled:opacity-50 cursor-pointer"
                  />
                </div>

                {/* Email Toggle */}
                <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                  <span className="sm:hidden text-xs font-semibold text-stone-600">
                    {t("notifications.notificationPreferencesPage.parEmail")}
                  </span>
                  <input
                    type="checkbox"
                    checked={pref.email}
                    disabled={sec.isMandatory}
                    onChange={() => handleToggle(sec.key, "email")}
                    aria-label={t(
                      "notifications.notificationPreferencesPage.canalPourAlerte",
                      {
                        channel: t(
                          "notifications.notificationPreferencesPage.canalEmail",
                        ),
                        alert: sec.title,
                      },
                    )}
                    className="w-4.5 h-4.5 text-primary rounded-md border-border-base focus:ring-primary disabled:opacity-50 cursor-pointer"
                  />
                </div>

                {/* Push Toggle */}
                <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                  <span className="sm:hidden text-xs font-semibold text-stone-600">
                    {t(
                      "notifications.notificationPreferencesPage.surMobilePush",
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={pref.push}
                    onChange={() => handleToggle(sec.key, "push")}
                    aria-label={t(
                      "notifications.notificationPreferencesPage.canalPourAlerte",
                      {
                        channel: t(
                          "notifications.notificationPreferencesPage.canalPush",
                        ),
                        alert: sec.title,
                      },
                    )}
                    className="w-4.5 h-4.5 text-primary rounded-md border-border-base focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
