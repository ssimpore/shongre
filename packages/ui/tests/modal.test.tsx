import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Drawer, Modal } from "../src/feedback/Modal.web";

describe("Modal", () => {
  it("removes every visible dismiss affordance when dismissal is disabled", () => {
    const markup = renderToStaticMarkup(
      <Modal isOpen onClose={vi.fn()} title="Consentement" dismissible={false}>
        <button type="button">Choisir</button>
      </Modal>,
    );

    expect(markup).not.toContain("Fermer");
    expect(markup).toContain("Choisir");
  });

  it("keeps the close control for ordinary dialogs", () => {
    const markup = renderToStaticMarkup(
      <Modal isOpen onClose={vi.fn()} title="Profil">
        <p>Contenu</p>
      </Modal>,
    );

    expect(markup).toContain('aria-label="Fermer"');
  });
});

describe("Drawer", () => {
  it("uses the bottom-sheet recipe by default", () => {
    const markup = renderToStaticMarkup(
      <Drawer isOpen onClose={vi.fn()} title="Filtres">
        <p>Contenu</p>
      </Drawer>,
    );

    expect(markup).toContain("slide-in-from-bottom");
    expect(markup).toContain("max-h-dialog-drawer-max-height");
    expect(markup).not.toContain("slide-in-from-right");
  });

  it("uses a full-height side-sheet recipe on the right", () => {
    const markup = renderToStaticMarkup(
      <Drawer isOpen onClose={vi.fn()} title="Preuves" position="right">
        <p>Contenu</p>
      </Drawer>,
    );

    expect(markup).toContain("slide-in-from-right");
    expect(markup).toContain("h-side-sheet-height");
    expect(markup).toContain("sm:w-side-sheet-width");
    expect(markup).not.toContain("slide-in-from-bottom");
  });
});
