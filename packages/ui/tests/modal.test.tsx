import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "../src/feedback/Modal.web";

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
