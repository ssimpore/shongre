import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeListingRailSizing } from "./listing-rail-sizing";

function card(titleHeight: number) {
  const row = (height: number) => ({
    height,
    metrics: { display: "block" },
    getBoundingClientRect() {
      return { height: this.height };
    },
  });
  const title = row(titleHeight);
  const media = row(256);
  const content = {
    children: [row(13), row(20), title, row(13)],
    metrics: { rowGap: "4px", paddingTop: "6px", paddingBottom: "6px" },
  };
  const element = {
    metrics: { borderTopWidth: "1px", borderBottomWidth: "1px" },
    visible: true,
    querySelector: (selector: string) =>
      selector.includes("media") ? media : content,
    checkVisibility() {
      return this.visible;
    },
  };
  return {
    element: element as unknown as HTMLElement,
    title,
    setVisible: (value: boolean) => {
      element.visible = value;
    },
  };
}

describe("shared rail sizing", () => {
  let frame: (() => void) | undefined;
  let resize: () => void;
  let mutation: () => void;
  let visibility: () => void;
  const disconnect = vi.fn();
  const cancel = vi.fn();
  const flush = () => {
    const callback = frame;
    frame = undefined;
    callback?.();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    frame = undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: () => void) => {
        frame = callback;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", cancel);
    vi.stubGlobal(
      "getComputedStyle",
      (element: { metrics: object }) => element.metrics,
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = disconnect;
      },
    );
    vi.stubGlobal(
      "MutationObserver",
      class {
        constructor(callback: () => void) {
          mutation = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  function group(cards: HTMLElement[]) {
    const style = { setProperty: vi.fn(), removeProperty: vi.fn() };
    const removeEventListener = vi.fn();
    const root = {
      querySelectorAll: () => cards,
      style,
      addEventListener: vi.fn((_event: string, callback: () => void) => {
        visibility = callback;
      }),
      removeEventListener,
    } as unknown as HTMLElement;
    const cleanup = observeListingRailSizing(root);
    flush();
    return { style, cleanup, removeEventListener };
  }

  it("uses the tallest natural card and recalculates when text grows or shrinks", () => {
    const short = card(36);
    const long = card(72);
    const { style, cleanup } = group([short.element, long.element]);
    expect(style.setProperty).toHaveBeenLastCalledWith(
      "--listing-rail-measured-height",
      "400px",
    );
    long.title.height = 144;
    resize();
    resize();
    flush();
    expect(style.setProperty).toHaveBeenLastCalledWith(
      "--listing-rail-measured-height",
      "472px",
    );
    long.title.height = 36;
    resize();
    flush();
    expect(style.setProperty).toHaveBeenLastCalledWith(
      "--listing-rail-measured-height",
      "364px",
    );
    expect(style.setProperty).toHaveBeenCalledTimes(3);
    cleanup();
  });

  it("preserves deferred sections and remembers their height after they leave view", () => {
    const short = card(36);
    const long = card(72);
    long.setVisible(false);
    const { style, cleanup } = group([short.element, long.element]);
    expect(style.setProperty).toHaveBeenLastCalledWith(
      "--listing-rail-measured-height",
      "364px",
    );
    long.setVisible(true);
    visibility();
    flush();
    expect(style.setProperty).toHaveBeenLastCalledWith(
      "--listing-rail-measured-height",
      "400px",
    );
    long.setVisible(false);
    visibility();
    flush();
    expect(style.setProperty).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("drops removed cards and releases observers and queued measurements", () => {
    const cards = [card(36).element, card(72).element];
    const { style, cleanup, removeEventListener } = group(cards);
    cards.pop();
    mutation();
    flush();
    expect(style.setProperty).toHaveBeenLastCalledWith(
      "--listing-rail-measured-height",
      "364px",
    );
    resize();
    cleanup();
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(removeEventListener).toHaveBeenCalledWith(
      "contentvisibilityautostatechange",
      visibility,
      true,
    );
    expect(cancel).toHaveBeenCalledWith(1);
    expect(style.removeProperty).toHaveBeenCalledWith(
      "--listing-rail-measured-height",
    );
  });
});
