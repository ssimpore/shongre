import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField, Input, Switch } from "../src/forms/FormField.web";

describe("FormField control association", () => {
  it("associates an existing input ID with its label, hint and validation error", () => {
    const markup = renderToStaticMarkup(
      <FormField label="Rémunération minimale" hint="Par mois">
        <Input id="employment-salary" />
      </FormField>,
    );
    expect(markup).toContain('for="employment-salary"');
    expect(markup).toContain('id="employment-salary"');
    expect(markup).toContain('aria-describedby="employment-salary-hint"');
    const invalid = renderToStaticMarkup(
      <FormField label="Rémunération minimale" error="Choisissez une période">
        <Input id="employment-salary" />
      </FormField>,
    );
    expect(invalid).toContain('for="employment-salary"');
    expect(invalid).toContain('aria-describedby="employment-salary-error"');
    expect(invalid).toContain('aria-invalid="true"');
  });
  it("lets an explicit label target own the control ID", () => {
    const markup = renderToStaticMarkup(
      <FormField label="Budget" htmlFor="budget">
        <Input id="obsolete-id" />
      </FormField>,
    );
    expect(markup).toContain('for="budget"');
    expect(markup).toContain('id="budget"');
    expect(markup).not.toContain("obsolete-id");
  });
});

describe("Switch", () => {
  it("makes the native input own the complete labelled touch target", () => {
    const markup = renderToStaticMarkup(
      <Switch
        checked={false}
        onChange={() => undefined}
        label="Mesure d’audience"
        description="Statistiques anonymisées"
      />,
    );

    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-label="Mesure d’audience"');
    expect(markup).toContain('aria-describedby="switch-');
    expect(markup).toContain('-description"');
    expect(markup).toContain("min-h-control-touch");
    expect(markup).toContain("absolute inset-0");
    expect(markup).not.toContain("sr-only");
  });
});
