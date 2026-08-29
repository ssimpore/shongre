import { useMemo, useState } from "react";
import { taxonomyAdminRepository } from "../../../../repositories/taxonomy.repository";

type Section =
  | "listing_types"
  | "groups_options"
  | "bindings"
  | "rules"
  | "markets_sellers"
  | "migration";

const sections: Array<{ id: Section; label: string }> = [
  { id: "listing_types", label: "Types d’annonce" },
  { id: "groups_options", label: "Groupes & options" },
  { id: "bindings", label: "Matrice d’attributs" },
  { id: "rules", label: "Dépendances & validations" },
  { id: "markets_sellers", label: "Marchés & vendeurs" },
  { id: "migration", label: "Import & migration" },
];

export function TaxonomyV4GovernanceTab() {
  const snapshot = useMemo(
    () => taxonomyAdminRepository.getV4GovernanceSnapshot(),
    [],
  );
  const [section, setSection] = useState<Section>("listing_types");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
  const listingTypes = snapshot.listingTypes.filter((listingType) =>
    [
      listingType.id,
      listingType.categoryId,
      listingType.intent,
      listingType.labels["fr-FR"],
    ].some((value) =>
      String(value).toLocaleLowerCase("fr-FR").includes(normalizedQuery),
    ),
  );
  const mappedDemoListings = snapshot.demoMigration.reduce(
    (total, entry) => total + entry.affectedListingIds.length,
    0,
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
        <h2 className="text-base font-black text-text-main">
          Gouvernance du schéma v4 généré
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Projection publique en lecture seule. Les règles privées, juridiques
          et de risque restent exclusivement côté backend.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Catégories", snapshot.metadata.sourceCounts.categories],
            ["Types", snapshot.listingTypes.length],
            ["Groupes", snapshot.attributeGroups.length],
            ["Jeux d’options", snapshot.optionSets.length],
            ["Liens parents", snapshot.optionParentLinks.length],
            ["Liaisons", snapshot.metadata.sourceCounts.bindings],
            ["Alias", snapshot.aliases.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control bg-bg-base p-3">
              <dt className="text-micro font-bold uppercase text-text-muted">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-black text-text-main">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Ressources de taxonomie v4"
      >
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            className={`rounded-control border px-3 py-2 text-xs font-bold ${
              section === item.id
                ? "border-primary bg-primary-light text-primary"
                : "border-border-base bg-white text-text-muted"
            }`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
        {section === "listing_types" ? (
          <div className="space-y-4">
            <label className="block text-xs font-bold text-text-main">
              Rechercher un type d’annonce
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-2 h-control-md w-full rounded-control border border-border-base bg-bg-base px-3 font-normal"
              />
            </label>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-base text-text-muted">
                    <th className="p-2">Identifiant</th>
                    <th className="p-2">Catégorie</th>
                    <th className="p-2">Intention</th>
                    <th className="p-2">Vendeurs</th>
                    <th className="p-2">Marchés actifs</th>
                  </tr>
                </thead>
                <tbody>
                  {listingTypes.slice(0, 100).map((listingType) => (
                    <tr
                      key={listingType.id}
                      className="border-b border-border-subtle"
                    >
                      <td className="p-2 font-mono">{listingType.id}</td>
                      <td className="p-2">{listingType.categoryId}</td>
                      <td className="p-2">{listingType.intent}</td>
                      <td className="p-2">
                        {listingType.sellerEligibility.individualAllowed
                          ? "Particulier "
                          : ""}
                        {listingType.sellerEligibility.professionalAllowed
                          ? "Pro"
                          : ""}
                      </td>
                      <td className="p-2">
                        {listingType.marketAvailability
                          .filter((market) => market.marketplaceEnabled)
                          .map((market) => market.marketCode)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {listingTypes.length > 100 ? (
              <p className="text-xs text-text-muted">
                100 résultats affichés sur {listingTypes.length}. Affinez la
                recherche.
              </p>
            ) : null}
          </div>
        ) : null}

        {section === "groups_options" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ResourceList
              title={`Groupes d’attributs (${snapshot.attributeGroups.length})`}
              rows={snapshot.attributeGroups.map((group) => ({
                id: group.id,
                label: group.labels["fr-FR"],
              }))}
            />
            <ResourceList
              title={`Jeux d’options (${snapshot.optionSets.length}) · ${snapshot.options.length} options normalisées`}
              rows={snapshot.optionSets.map((optionSet) => ({
                id: optionSet.id,
                label: optionSet.labels["fr-FR"],
              }))}
            />
            <p className="text-xs text-text-muted lg:col-span-2">
              {snapshot.optionParentLinks.length} liens parent-enfant explicites
              pilotent les sélecteurs en cascade sans dupliquer les options.
            </p>
          </div>
        ) : null}

        {section === "bindings" ? (
          <div className="space-y-3">
            <h3 className="font-black text-text-main">Matrice résolue</h3>
            <p className="text-xs text-text-muted">
              {snapshot.metadata.sourceCounts.bindings.toLocaleString("fr-FR")}{" "}
              liaisons sources, filtrées dans cette projection pour exclure les
              champs privés.
            </p>
            <ResourceList
              title="Extrait public"
              rows={snapshot.bindings.slice(0, 100).map((binding) => ({
                id: binding.id,
                label: `${binding.categoryId} · ${binding.listingTypeId} · ${binding.attributeId}`,
              }))}
            />
          </div>
        ) : null}

        {section === "rules" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ResourceList
              title={`Dépendances publiques (${snapshot.dependencyRules.length})`}
              rows={snapshot.dependencyRules.map((rule) => ({
                id: rule.id,
                label: `${rule.effect} · ${rule.trigger.kind}:${rule.trigger.key}`,
              }))}
            />
            <ResourceList
              title={`Validations publiques (${snapshot.validationRules.length})`}
              rows={snapshot.validationRules.map((rule) => ({
                id: rule.id,
                label: `${rule.severity} · ${rule.target.kind}:${rule.target.key}`,
              }))}
            />
          </div>
        ) : null}

        {section === "markets_sellers" ? (
          <div className="space-y-4 text-xs text-text-main">
            <p>
              FR, BE et CH sont disponibles selon chaque enregistrement. SN et
              BF restent « bientôt disponible », non publiables et non
              indexables.
            </p>
            <p>
              L’éligibilité particulier/professionnel est portée par les
              catégories, types d’annonce et attributs, puis résolue côté
              backend.
            </p>
          </div>
        ) : null}

        {section === "migration" ? (
          <div className="space-y-5">
            <p className="text-xs text-text-muted">
              Classeur {snapshot.metadata.workbookSha256.slice(0, 12)}… · source
              normalisée {snapshot.metadata.normalizedSha256.slice(0, 12)}… ·
              compilateur {snapshot.metadata.compilerVersion}
            </p>
            <p className="text-xs text-text-main">
              {snapshot.crosswalk.length} identités v3 revues ·{" "}
              {mappedDemoListings}
              annonces de démonstration conservées · aucun référencement ambigu.
            </p>
            <ResourceList
              title="Dry-run des annonces de démonstration"
              rows={snapshot.demoMigration.map((entry) => ({
                id: entry.source,
                label: `${entry.status} → ${entry.canonicalNodeId ?? "à revoir"} (${entry.affectedListingIds.length})`,
              }))}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ResourceList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-black text-text-main">{title}</h3>
      <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto" tabIndex={0}>
        {rows.map((row) => (
          <li key={row.id} className="rounded-control bg-bg-base p-2 text-xs">
            <span className="font-mono text-text-muted">{row.id}</span>
            <span className="ml-2 text-text-main">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
