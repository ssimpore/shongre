import { useCallback, useEffect, useRef, useState } from "react";
import { TAXONOMY_ADMIN_CONSTRAINTS } from "@shongre/contracts/taxonomy";
import type { components } from "@shongre/contracts/openapi";
import { services } from "../../../../api/client/service-registry";
import { Button } from "../../../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Select,
} from "../../../../design-system/primitives/FormField";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { adminCatalogueFr } from "../../../../i18n/admin.catalogue.fr";

type Draft = components["schemas"]["TaxonomyDraftPage"];
type Review = components["schemas"]["TaxonomyRevisionReview"];
type History = components["schemas"]["TaxonomyRevisionHistory"];

export function TaxonomyRevisionEditor() {
  const { t } = useTranslation(adminCatalogueFr);
  const [resource, setResource] = useState<Draft["resource"]>("categories");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(0);
  const [editor, setEditor] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setError(null);
    setDraft(null);
    setReview(null);
    try {
      const [next, revisions] = await Promise.all([
        services.taxonomy.getAdminDraft({ resource, offset, limit: 100 }),
        services.taxonomy.getAdminHistory(),
      ]);
      if (current !== generation.current) return;
      setDraft(next);
      setHistory(revisions);
      setSelected(0);
      setEditor(JSON.stringify(next.records[0] ?? {}, null, 2));
    } catch (caught) {
      if (current === generation.current)
        setError(
          caught instanceof Error
            ? caught.message
            : t("admin.taxonomyEditor.failed"),
        );
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }, [resource, offset, t]);
  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  const action = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.taxonomyEditor.failed"),
      );
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    action(async () => {
      if (!draft) return;
      const parsed: unknown = JSON.parse(editor);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      if (!records.length || records.length > 20000)
        throw new Error(t("admin.taxonomyEditor.invalidRecords"));
      if (
        records.some(
          (row) => !row || typeof row !== "object" || Array.isArray(row),
        )
      )
        throw new Error(t("admin.taxonomyEditor.invalidRecords"));
      let revision = draft.revision;
      let result: Review | null = null;
      for (let start = 0; start < records.length; start += 200) {
        result = await services.taxonomy.updateAdminDraft({
          expectedRevision: revision,
          resource,
          records: records.slice(start, start + 200),
          changeReason: reason,
        });
        revision = result.revision;
      }
      await load();
      setReview(result);
      setNotice(t("admin.taxonomyEditor.saved"));
    });
  const preview = () =>
    action(async () => {
      setReview(await services.taxonomy.previewAdminDraft());
    });
  const publish = () =>
    action(async () => {
      if (!draft || !review?.valid || review.revision !== draft.revision)
        return;
      await services.taxonomy.publishAdminDraft({
        expectedRevision: draft.revision,
        changeReason: reason,
      });
      await load();
      setNotice(t("admin.taxonomyEditor.published"));
    });
  const rollback = (targetRevision: number) =>
    action(async () => {
      if (!draft) return;
      await services.taxonomy.rollbackAdminRevision({
        expectedRevision: draft.revision,
        targetRevision,
        changeReason: reason,
      });
      await load();
      setNotice(t("admin.taxonomyEditor.restored"));
    });
  const exportResource = () =>
    action(async () => {
      if (!draft) return;
      const records: Draft["records"][number][] = [];
      let total = 0;
      do {
        const page = await services.taxonomy.getAdminDraft({
          resource,
          offset: records.length,
          limit: 200,
        });
        if (page.revision !== draft.revision)
          throw new Error(t("admin.taxonomyEditor.conflict"));
        records.push(...page.records);
        total = page.total;
      } while (records.length < total);
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { resource, revision: draft.revision, records },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `taxonomy-${resource}-r${draft.revision}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  const selectRow = (index: number) => {
    setSelected(index);
    setEditor(JSON.stringify(draft?.records[index] ?? {}, null, 2));
    setNotice(null);
  };
  const rowLabel = (row: Draft["records"][number]) => {
    const labels = row.labels as Record<string, string> | undefined;
    return `${labels?.["fr-FR"] ?? row.id ?? row.alias ?? row.optionId}`;
  };
  return (
    <section
      aria-labelledby="taxonomy-revision-title"
      className="space-y-4 rounded-card border border-border-base bg-bg-surface p-5"
    >
      <div>
        <h2
          id="taxonomy-revision-title"
          className="text-lg font-bold text-text-main"
        >
          {t("admin.taxonomyEditor.title")}
        </h2>
        <p className="text-sm text-text-secondary">
          {t("admin.taxonomyEditor.description")}
        </p>
      </div>
      {error && (
        <div role="alert" className="text-sm text-danger">
          {error}{" "}
          <Button
            variant="secondary"
            onClick={() => void load()}
            disabled={busy}
          >
            {t("admin.taxonomyEditor.reload")}
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-text-main">
          {notice}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-text-secondary">
          {t("admin.taxonomyEditor.loading")}
        </p>
      )}
      {draft && (
        <>
          <p className="text-xs text-text-secondary">
            {t("admin.taxonomyEditor.draftRevision")} {draft.revision} ·{" "}
            {t("admin.taxonomyEditor.publishedRevision")}{" "}
            {draft.publishedRevision ?? "—"}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={t("admin.taxonomyEditor.resource")}>
              <Select
                aria-label={t("admin.taxonomyEditor.resource")}
                value={resource}
                disabled={busy}
                onChange={(event) => {
                  setResource(event.target.value as Draft["resource"]);
                  setOffset(0);
                }}
              >
                {draft.resources.map((item) => (
                  <option key={item.resource} value={item.resource}>
                    {t(`admin.taxonomyEditor.resource.${item.resource}`)} (
                    {item.count})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t("admin.taxonomyEditor.record")}>
              <Select
                aria-label={t("admin.taxonomyEditor.record")}
                value={selected}
                disabled={busy || !draft.records.length}
                onChange={(event) => selectRow(Number(event.target.value))}
              >
                {draft.records.map((row, index) => (
                  <option key={index} value={index}>
                    {rowLabel(row)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          {!draft.records.length && (
            <p className="text-sm text-text-secondary">
              {t("admin.taxonomyEditor.empty")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 100))}
            >
              {t("admin.taxonomyEditor.previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy || offset + draft.records.length >= draft.total}
              onClick={() => setOffset(offset + 100)}
            >
              {t("admin.taxonomyEditor.next")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setSelected(-1);
                setEditor("{}");
              }}
            >
              {t("admin.taxonomyEditor.add")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void exportResource()}
            >
              {t("admin.taxonomyEditor.export")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {t("admin.taxonomyEditor.import")}
            </Button>
            <input
              type="file"
              accept="application/json,.json"
              ref={fileInput}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void action(async () => {
                  if (file.size > 20 * 1024 * 1024)
                    throw new Error(t("admin.taxonomyEditor.invalidRecords"));
                  const payload: unknown = JSON.parse(await file.text());
                  if (
                    payload &&
                    typeof payload === "object" &&
                    "resource" in payload &&
                    payload.resource !== resource
                  )
                    throw new Error(t("admin.taxonomyEditor.invalidRecords"));
                  const rows =
                    payload &&
                    typeof payload === "object" &&
                    "records" in payload
                      ? payload.records
                      : payload;
                  setEditor(JSON.stringify(rows, null, 2));
                  setNotice(t("admin.taxonomyEditor.importReady"));
                });
              }}
            />
          </div>
          <FormField label={t("admin.taxonomyEditor.definition")}>
            <textarea
              aria-label={t("admin.taxonomyEditor.definition")}
              value={editor}
              onChange={(event) => setEditor(event.target.value)}
              disabled={busy}
              spellCheck={false}
              className="min-h-80 w-full rounded-control border border-border-base bg-bg-base p-3 font-mono text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
          <p className="text-xs text-text-secondary">
            {t("admin.taxonomyEditor.importLimit")}
          </p>
          <FormField label={t("admin.taxonomyEditor.reason")}>
            <Input
              aria-label={t("admin.taxonomyEditor.reason")}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={TAXONOMY_ADMIN_CONSTRAINTS.changeReason.max}
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                busy ||
                reason.trim().length <
                  TAXONOMY_ADMIN_CONSTRAINTS.changeReason.min
              }
              onClick={() => void save()}
            >
              {t("admin.taxonomyEditor.save")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void preview()}
            >
              {t("admin.taxonomyEditor.preview")}
            </Button>
            <Button
              disabled={
                busy ||
                reason.trim().length <
                  TAXONOMY_ADMIN_CONSTRAINTS.changeReason.min ||
                !review?.valid ||
                review.revision !== draft.revision
              }
              onClick={() => void publish()}
            >
              {t("admin.taxonomyEditor.publish")}
            </Button>
          </div>
          {review && (
            <div aria-live="polite" className="space-y-2 text-sm">
              <p className="font-semibold">
                {review.valid
                  ? t("admin.taxonomyEditor.valid")
                  : t("admin.taxonomyEditor.invalid")}
              </p>
              <p>{t("admin.taxonomyEditor.contentReview")}</p>
              {review.impact && (
                <p>
                  {t("admin.taxonomyEditor.impact")}{" "}
                  {review.impact.categoryIds.length} /{" "}
                  {review.impact.listingTypeIds.length} /{" "}
                  {review.impact.attributeIds.length} /{" "}
                  {review.impact.optionIds.length}
                </p>
              )}
              <ul className="max-h-64 list-disc overflow-auto pl-5">
                {[...review.issues, ...review.warnings].map((issue, index) => (
                  <li key={index}>
                    {issue.id} : {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details>
            <summary className="cursor-pointer font-semibold text-text-main">
              {t("admin.taxonomyEditor.history")}
            </summary>
            <ul className="mt-3 space-y-2">
              {history?.records.map((revision) => (
                <li
                  key={revision.revision}
                  className="flex flex-wrap items-center gap-3 text-sm"
                >
                  <span>
                    r{revision.revision} · {revision.changeReason}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={
                      busy ||
                      revision.revision === draft.publishedRevision ||
                      reason.trim().length <
                        TAXONOMY_ADMIN_CONSTRAINTS.changeReason.min
                    }
                    onClick={() => void rollback(revision.revision)}
                  >
                    {t("admin.taxonomyEditor.restore")}
                  </Button>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-2">
              {history?.events?.map((event, index) => (
                <li key={index} className="text-xs text-text-secondary">
                  {event.createdAt} · {event.action} · {event.reason}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
