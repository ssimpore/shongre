import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const captureException = vi.fn();
const routeError = { value: undefined as unknown };

vi.mock("../../services/telemetry.service", () => ({
  telemetryService: {
    captureException: (...args: unknown[]) => captureException(...args),
  },
}));

vi.mock("react-router-dom", () => ({
  useRouteError: () => routeError.value,
  useNavigate: () => vi.fn(),
  isRouteErrorResponse: (error: unknown) =>
    typeof error === "object" && error !== null && "status" in error,
}));

/*
 * `useTranslation` and `Button` each pull the market/runtime config graph in at
 * import time, which needs environment this unit does not. Stubbing them keeps
 * the test about the boundary's own behaviour.
 */
vi.mock("../../i18n/I18nProvider", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "fr-FR" }),
}));

vi.mock("../../design-system/primitives/Button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children?: unknown;
    onClick?: () => void;
  }) => React.createElement("button", { onClick }, children as React.ReactNode),
}));

const { RouteErrorBoundary } = await import("./RouteErrorBoundary");

const render = () =>
  renderToStaticMarkup(React.createElement(RouteErrorBoundary));

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    captureException.mockClear();
    routeError.value = new Error("render exploded");
  });

  it("announces the failure rather than rendering a silent blank branch", () => {
    expect(render()).toContain('role="alert"');
  });

  /*
   * The root boundary's only escapes are a full reload and a jump to the
   * homepage. A branch-level failure should not cost the user their place, so
   * this one has to offer its own way out.
   */
  it("offers two recovery actions", () => {
    const markup = render();
    expect((markup.match(/<button/g) ?? []).length).toBe(2);
  });

  it("reports an unexpected render error to telemetry", () => {
    render();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("does not report a routing 404 as a crash", () => {
    routeError.value = { status: 404, statusText: "Not Found", data: null };
    render();
    expect(captureException).not.toHaveBeenCalled();
  });
});
