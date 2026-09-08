import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isRestoring: false,
  currentUser: null as { id: string } | null,
}));
vi.mock("../../app/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("../../i18n/I18nProvider", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key.endsWith("creerUnCompte")
        ? "Créer un compte"
        : "Connectez-vous pour continuer.",
  }),
}));

const render = () =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={["/compte/messages?tab=unread#latest"]}>
      <RequireAuth>
        <p>Private messages</p>
      </RequireAuth>
    </MemoryRouter>,
  );

describe("shared authentication prompt", () => {
  beforeEach(() =>
    Object.assign(auth, {
      isAuthenticated: false,
      isRestoring: false,
      currentUser: null,
    }),
  );

  it("uses equal responsive columns and preserves both return destinations", () => {
    const html = render();
    expect(html).toContain("sm:inline-grid sm:grid-cols-2");
    expect(html).not.toContain("sm:w-auto");
    expect(html).toContain(
      'href="/connexion?redirect=%2Fcompte%2Fmessages%3Ftab%3Dunread%23latest"',
    );
    expect(html).toContain(
      'href="/inscription?redirect=%2Fcompte%2Fmessages%3Ftab%3Dunread%23latest"',
    );
    expect(html).not.toContain("Private messages");
  });

  it("retains the session-restoration state without exposing private content", () => {
    auth.isRestoring = true;
    expect(render()).toContain('aria-busy="true"');
    expect(render()).not.toContain("Private messages");
    expect(render()).not.toContain("/connexion");
  });

  it("renders children only after an authenticated user is available", () => {
    auth.isAuthenticated = true;
    expect(render()).not.toContain("Private messages");
    auth.currentUser = { id: "authenticated-user" };
    expect(render()).toBe("<p>Private messages</p>");
  });
});
