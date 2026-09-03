import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Trash2 } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { services } from "../../api/client/service-registry";
import { Breadcrumbs } from "../../design-system/components/Breadcrumbs";
import { Button } from "../../design-system/primitives/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import { ACCOUNT_CONSTRAINTS } from "@shongre/contracts/account";
import { FormField, Input, Textarea } from "../../design-system";

export const AccountDeletionPage: React.FC = () => {
  usePageMeta({
    title: "Supprimer un compte Shongre",
    description:
      "Demandez la suppression définitive de votre compte Shongre depuis le web, sans utiliser l’application mobile.",
    canonicalPath: "/account/delete",
    noIndex: true,
  });

  const navigate = useNavigate();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    if (confirmation !== "SUPPRIMER") {
      setError("Saisissez exactement SUPPRIMER pour confirmer.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await services.auth.deleteAccount(password, reason.trim() || undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La suppression n’a pas pu être effectuée. Réessayez.",
      );
      setIsSubmitting(false);
      return;
    }
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Supprimer un compte" },
        ]}
      />
      <div className="mt-6 space-y-6 rounded-card border border-border-base bg-bg-surface p-6 shadow-xs sm:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-danger-surface text-danger">
            <Trash2 className="h-icon-md w-icon-md" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl">
              Supprimer votre compte Shongre
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Cette page web permet de demander une suppression sans disposer de
              l’application mobile.
            </p>
          </div>
        </div>

        <div className="rounded-control border border-warning-border bg-warning-surface p-4 text-sm leading-relaxed text-warning">
          <div className="flex gap-2">
            <ShieldAlert
              className="mt-0.5 h-icon-md w-icon-md shrink-0"
              aria-hidden="true"
            />
            <p>
              La suppression révoque vos sessions et anonymise les données sans
              obligation de conservation. Les commandes, paiements, litiges et
              obligations comptables peuvent être conservés pendant la durée
              légale applicable. Une transaction en cours doit être terminée
              avant la suppression.
            </p>
          </div>
        </div>

        {!isAuthenticated || !currentUser ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text-main">
              Vérifiez d’abord votre identité
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              Connectez-vous sur le web pour effectuer la demande de façon
              sécurisée. Si vous n’avez plus accès à votre compte, contactez
              l’assistance : elle vérifiera votre identité avant toute
              suppression.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                to="/connexion?redirect=/account/delete"
                variant="primary"
              >
                Se connecter sur le web
              </Button>
              <Button to="/contact" variant="outline">
                Contacter l’assistance
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleDelete}>
            <div>
              <h2 className="text-lg font-bold text-text-main">
                Confirmer la suppression de {currentUser.email}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Votre mot de passe confirme que la demande vient bien de vous.
              </p>
            </div>
            <FormField label="Mot de passe actuel" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </FormField>
            <FormField label="Motif facultatif">
              <Textarea
                maxLength={ACCOUNT_CONSTRAINTS.deletionReasonMaxLength}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
            <FormField label="Saisissez SUPPRIMER" required>
              <Input
                className="uppercase"
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value.toUpperCase())
                }
                required
              />
            </FormField>
            {error && (
              <p role="alert" className="text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="danger" isLoading={isSubmitting}>
                Supprimer définitivement
              </Button>
              <Button to="/compte" variant="outline">
                Annuler
              </Button>
            </div>
          </form>
        )}

        <p className="text-xs leading-relaxed text-text-muted">
          Consultez aussi notre{" "}
          <Link
            className="font-bold text-primary hover:underline"
            to="/privacy"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default AccountDeletionPage;
