const cardSelector = ".listing-rail-cell .listing-card-standard";
const heightProperty = "--listing-rail-measured-height";
const pixels = (value: string) => Number.parseFloat(value) || 0;

/** Read natural rows, not the stretched card height, so a group can shrink too. */
function naturalCardHeight(card: HTMLElement): number {
  const media = card.querySelector<HTMLElement>("[data-listing-card-media]");
  const content = card.querySelector<HTMLElement>(
    "[data-listing-card-content]",
  );
  if (!media || !content) return 0;
  const rows = Array.from(content.children).filter(
    (row) => getComputedStyle(row).display !== "none",
  );
  const contentStyle = getComputedStyle(content);
  const cardStyle = getComputedStyle(card);
  return (
    media.getBoundingClientRect().height +
    rows.reduce(
      (height, row) => height + row.getBoundingClientRect().height,
      0,
    ) +
    Math.max(0, rows.length - 1) * pixels(contentStyle.rowGap) +
    pixels(contentStyle.paddingTop) +
    pixels(contentStyle.paddingBottom) +
    pixels(cardStyle.borderTopWidth) +
    pixels(cardStyle.borderBottomWidth)
  );
}

/** Coordinate actual content across rails without fixed title limits or a second card. */
export function observeListingRailSizing(root: HTMLElement): () => void {
  const heights = new Map<HTMLElement, number>();
  const observed = new Set<Element>();
  let frame = 0;
  let publishedHeight = 0;

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  const resize = new ResizeObserver(schedule);
  // A deferred section may intersect before WebKit lays out its contents.
  // Listen for the actual rendering transition, not the earlier intersection.
  root.addEventListener("contentvisibilityautostatechange", schedule, true);

  function measure() {
    frame = 0;
    const cards = new Set(root.querySelectorAll<HTMLElement>(cardSelector));
    const nextObserved = new Set<Element>();
    for (const card of heights.keys()) {
      if (!cards.has(card)) {
        heights.delete(card);
      }
    }
    for (const card of cards) {
      if (!heights.has(card)) {
        heights.set(card, 0);
      }
      const media = card.querySelector("[data-listing-card-media]");
      const content = card.querySelector("[data-listing-card-content]");
      if (media) nextObserved.add(media);
      if (content) {
        nextObserved.add(content);
        for (const row of content.children) nextObserved.add(row);
      }
      // Preserve content-visibility's deferred rendering. A section entering
      // view updates the shared minimum; previously measured sections retain it.
      if (card.checkVisibility({ contentVisibilityAuto: true })) {
        heights.set(card, naturalCardHeight(card));
      }
    }
    for (const element of observed) {
      if (!nextObserved.has(element)) {
        resize.unobserve(element);
        observed.delete(element);
      }
    }
    for (const element of nextObserved) {
      if (!observed.has(element)) {
        resize.observe(element);
        observed.add(element);
      }
    }
    const nextHeight = Math.ceil(Math.max(0, ...heights.values()));
    if (nextHeight !== publishedHeight) {
      root.style.setProperty(heightProperty, `${nextHeight}px`);
      publishedHeight = nextHeight;
    }
  }

  const mutations = new MutationObserver(schedule);
  mutations.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    root.removeEventListener(
      "contentvisibilityautostatechange",
      schedule,
      true,
    );
    mutations.disconnect();
    root.style.removeProperty(heightProperty);
  };
}
