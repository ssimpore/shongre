import { colors, motion, radius, typography } from "@shongre/design-tokens";

/**
 * The console is an inverse surface, like the Web application footer. Every
 * value resolves from a typed semantic role; the few `color-mix()` steps
 * derive elevation from those roles instead of introducing another colour.
 */
export function developerConsoleStyles(): string {
  return `
:root {
  --page: ${colors.surface.inverseDeep};
  --raise: ${colors.surface.inverseHover};
  --panel: color-mix(in srgb, var(--raise) 30%, var(--page));
  --panel-hover: color-mix(in srgb, var(--raise) 52%, var(--page));
  --inset: color-mix(in srgb, var(--raise) 14%, var(--page));
  --line: ${colors.border.inverse};
  --line-soft: color-mix(in srgb, var(--line) 60%, var(--page));
  --line-strong: ${colors.border.inverseSubtle};
  --ink: ${colors.text.inverseBright};
  --ink-soft: ${colors.text.inverseMuted};
  --ink-muted: ${colors.text.inverseSubtle};
  --ink-faint: color-mix(in srgb, ${colors.text.inverseSubtle} 84%, var(--page));
  --accent: ${colors.text.inverseBright};
  --accent-fill: ${colors.action.primary};
  --accent-tint: ${colors.action.primaryOverlay};
  --accent-line: ${colors.border.onInverse};
  --on-accent: ${colors.action.onPrimary};
  --ok: ${colors.status.successOnInverseStrong};
  --info: ${colors.status.infoOnInverse};
  --staff: ${colors.accent.staffOnInverse};
  --danger: ${colors.status.errorOnInverse};
  --transparent: ${colors.surface.transparent};
  --font-sans: ${typography.fontFamilies.sans};
  --font-mono: ${typography.fontFamilies.mono};
  --r-sm: ${radius.sm};
  --r-md: ${radius.md};
  --r-lg: ${radius.lg};
  --r-xl: ${radius.xl};
  --r-2xl: ${radius["2xl"]};
  --r-pill: ${radius.pill};
  --speed: ${motion.duration.fast};
  --ease: ${motion.easing.standard};
  --topbar-h: 3rem;
  --sidebar-w: 15.25rem;
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--page);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, p, ul, ol, figure { margin: 0; }
ul, ol { padding: 0; list-style: none; }
a { color: inherit; text-decoration: none; }
button, input, select, textarea { font: inherit; color: inherit; }
svg.icon { width: 1rem; height: 1rem; flex: none; }
svg.icon-sm { width: 0.875rem; height: 0.875rem; flex: none; }
svg.icon-lg { width: 1.125rem; height: 1.125rem; flex: none; }

:where(a, button, input, select, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}
.skip-link {
  position: absolute; left: 0.75rem; top: -3rem; z-index: 60;
  background: var(--accent-fill); color: var(--on-accent);
  padding: 0.5rem 0.875rem; border-radius: var(--r-md); font-weight: 700;
  transition: top var(--speed) var(--ease);
}
.skip-link:focus { top: 0.6rem; }

/* ---------------------------------------------------------------- top bar */
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 0.75rem;
  height: var(--topbar-h); padding: 0 0.875rem;
  background: color-mix(in srgb, var(--page) 88%, var(--transparent));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.topbar-brand { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
.brand-mark { display: flex; align-items: center; min-height: 1.75rem; }
.brand-logo { display: block; height: 1.125rem; width: 4.425rem; }
.brand-logo-sm { height: 0.9375rem; width: 3.6875rem; }
.topbar-kicker {
  display: inline-flex; align-items: center; min-height: 1.75rem;
  color: var(--ink-muted); font-size: 0.8125rem; font-weight: 600;
  white-space: nowrap;
}
.topbar-kicker:hover { color: var(--ink); }
.drawer-toggle {
  display: none; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; border-radius: var(--r-md);
  background: var(--transparent); border: 1px solid var(--line); cursor: pointer;
}
.topbar-search { flex: 1; display: flex; justify-content: center; min-width: 0; }
.search-field {
  position: relative; display: flex; align-items: center; gap: 0.5rem;
  width: min(28rem, 100%); height: 2rem; padding: 0 0.625rem;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); color: var(--ink-muted);
}
/* The ring lives on the wrapper because the inner input has no border. */
.search-field:focus-within {
  border-color: var(--accent);
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.search-field input {
  flex: 1; min-width: 0; align-self: stretch; background: none; border: 0;
  outline: none; font-size: 0.8125rem; color: var(--ink);
}
.search-field input::placeholder { color: var(--ink-faint); }
.search-field kbd {
  font-family: var(--font-mono); font-size: 0.6875rem; color: var(--ink-faint);
  border: 1px solid var(--line-strong); border-radius: var(--r-sm);
  padding: 0.0625rem 0.3125rem; white-space: nowrap;
}
.topbar-meta { display: flex; align-items: center; gap: 0.5rem; }
.meta-chip {
  display: inline-flex; align-items: center; gap: 0.375rem;
  height: 2rem; padding: 0 0.625rem; white-space: nowrap;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); font-size: 0.75rem; font-weight: 600;
  color: var(--ink-soft);
}
.signin {
  display: inline-flex; align-items: center; gap: 0.375rem;
  height: 2rem; padding: 0 0.875rem; border-radius: var(--r-lg);
  background: var(--ink); color: var(--page); font-size: 0.8125rem;
  font-weight: 700; border: 1px solid var(--ink); white-space: nowrap;
  transition: background var(--speed) var(--ease);
}
.signin:hover { background: var(--ink-soft); border-color: var(--ink-soft); }

/* ---------------------------------------------------------------- shell */
.shell { display: flex; align-items: flex-start; }
.sidebar {
  position: sticky; top: var(--topbar-h); flex: none;
  width: var(--sidebar-w); height: calc(100dvh - var(--topbar-h));
  overflow-y: auto; padding: 0.875rem 0.75rem 1.5rem;
  border-right: 1px solid var(--line);
}
/* The drawer covers the top bar on small screens, so it carries its own
   dismiss control instead of relying on the hidden toggle. */
.drawer-close {
  display: none; align-items: center; gap: 0.5rem; width: 100%;
  min-height: 2.25rem; margin-bottom: 0.75rem; padding: 0 0.625rem;
  cursor: pointer; border-radius: var(--r-lg);
  border: 1px solid var(--line); background: var(--panel);
  font-size: 0.8125rem; font-weight: 600; color: var(--ink-soft);
}
.drawer-close:hover { background: var(--panel-hover); color: var(--ink); }
.nav-group + .nav-group { margin-top: 1.25rem; }
.nav-title {
  padding: 0 0.625rem; margin-bottom: 0.375rem;
  font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--ink-faint);
}
.nav-link {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.4375rem 0.625rem; border-radius: var(--r-lg);
  font-size: 0.8125rem; font-weight: 600; color: var(--ink-soft);
  border-left: 2px solid var(--transparent);
  transition: background var(--speed) var(--ease), color var(--speed) var(--ease);
}
.nav-link:hover { background: var(--panel); color: var(--ink); }
.nav-link .icon { color: var(--ink-muted); }
.nav-link:hover .icon { color: var(--ink-soft); }
.nav-link[aria-current="page"] {
  background: var(--accent-tint); color: var(--accent);
  border-left-color: var(--accent);
}
.nav-link[aria-current="page"] .icon { color: var(--accent); }
.nav-link .nav-lock { margin-left: auto; color: var(--ink-faint); }
.nav-note {
  margin-top: 1.5rem; padding: 0.875rem; border: 1px solid var(--line);
  border-radius: var(--r-xl); background: var(--panel);
}
.nav-note-title { font-size: 0.8125rem; font-weight: 700; color: var(--ink); }
.nav-note p { margin-top: 0.25rem; font-size: 0.75rem; color: var(--ink-muted); }
.nav-note a {
  display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.5rem;
  min-height: 1.5rem; font-size: 0.75rem; font-weight: 700; color: var(--accent);
}
.sidebar-scrim {
  position: fixed; inset: 0; z-index: 44;
  background: ${colors.interaction.scrim}; border: 0;
}

/* ---------------------------------------------------------------- main */
.main { flex: 1; min-width: 0; padding: 1.5rem 1.75rem 3rem; }
.main-inner { max-width: 74rem; margin: 0 auto; }
.breadcrumb {
  display: flex; align-items: center; gap: 0.375rem;
  font-size: 0.75rem; color: var(--ink-faint);
}
.breadcrumb a {
  display: inline-flex; align-items: center; min-height: 1.5rem;
}
.breadcrumb a:hover { color: var(--ink-soft); }
.section { margin-top: 2.25rem; scroll-margin-top: calc(var(--topbar-h) + 1rem); }
.section-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 1rem; flex-wrap: wrap; margin-bottom: 0.875rem;
}
.section-head h2 { font-size: 1.125rem; font-weight: 800; letter-spacing: -0.01em; }
.section-head p { margin-top: 0.125rem; font-size: 0.8125rem; color: var(--ink-muted); }
.section-link {
  display: inline-flex; align-items: center; gap: 0.3125rem; min-height: 1.5rem;
  font-size: 0.8125rem; font-weight: 700; color: var(--accent);
}

/* ---------------------------------------------------------------- hero */
.hero { margin-top: 1rem; display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap; }
.hero-main { flex: 1 1 26rem; min-width: 0; }
.eyebrow { display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap; }
.eyebrow-label {
  font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-muted);
}
.hero h1 {
  margin-top: 0.5rem; font-size: clamp(1.875rem, 1.2rem + 2vw, 2.5rem);
  font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
}
.hero-lead { margin-top: 0.5rem; font-size: 1rem; font-weight: 600; color: var(--ink-soft); }
.hero-sub { margin-top: 0.25rem; font-size: 0.875rem; color: var(--ink-muted); max-width: 38rem; }
.hero-actions { display: flex; gap: 0.625rem; flex-wrap: wrap; margin-top: 1.25rem; }
.hero-side { flex: 1 1 20rem; min-width: 0; display: flex; flex-direction: column; gap: 0.875rem; }
.hero-status { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.hero-status .caption { font-size: 0.75rem; color: var(--ink-faint); }

.btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  height: 2.5rem; padding: 0 1rem; border-radius: var(--r-lg);
  font-size: 0.875rem; font-weight: 700; cursor: pointer;
  border: 1px solid var(--line-strong); background: var(--panel); color: var(--ink);
  transition: background var(--speed) var(--ease), border-color var(--speed) var(--ease);
}
.btn:hover:not(:disabled) { background: var(--panel-hover); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary {
  background: var(--accent-fill); border-color: var(--accent-fill); color: var(--on-accent);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-fill);
  border-color: var(--accent-fill);
}
.btn-sm { height: 2rem; padding: 0 0.75rem; font-size: 0.8125rem; }

.field-label {
  font-size: 0.75rem; font-weight: 700; color: var(--ink-muted);
  display: block; margin-bottom: 0.375rem;
}
.copy-row {
  display: flex; align-items: center; gap: 0.5rem;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); padding: 0.5rem 0.5rem 0.5rem 0.875rem;
}
.copy-row code {
  flex: 1; min-width: 0; font-family: var(--font-mono); font-size: 0.8125rem;
  color: var(--ink); overflow-x: auto; white-space: nowrap;
}
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem;
  min-width: 2rem; height: 2rem; padding: 0 0.4375rem; cursor: pointer;
  background: var(--transparent); border: 1px solid var(--transparent);
  border-radius: var(--r-md); color: var(--ink-muted);
  transition: background var(--speed) var(--ease), color var(--speed) var(--ease);
}
.icon-btn:hover { background: var(--panel-hover); color: var(--ink); }
.icon-btn[data-copied="true"] { color: var(--ok); }

/* ---------------------------------------------------------------- panels */
.panel {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-2xl); padding: 1rem 1.125rem;
}
.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem; flex-wrap: wrap;
}
.panel-head h3 { font-size: 0.9375rem; font-weight: 700; }
.grid { display: grid; gap: 0.75rem; }
.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-activity { grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); }
.grid-request { grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); }

.stat { display: flex; align-items: center; gap: 0.75rem; }
.stat-icon {
  display: flex; align-items: center; justify-content: center;
  width: 2.25rem; height: 2.25rem; flex: none;
  border-radius: var(--r-lg); border: 1px solid var(--line);
  background: var(--inset); color: var(--ink-soft);
}
.stat-body { min-width: 0; }
.stat-label { font-size: 0.75rem; color: var(--ink-muted); }
.stat-value {
  margin-top: 0.0625rem; font-size: 1.0625rem; font-weight: 800;
  letter-spacing: -0.01em; display: flex; align-items: center; gap: 0.375rem;
}
.stat-note { font-size: 0.6875rem; color: var(--ink-faint); }

.pill {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.1875rem 0.5rem; border-radius: var(--r-pill);
  font-size: 0.6875rem; font-weight: 700; white-space: nowrap;
  border: 1px solid var(--line-strong); color: var(--ink-soft);
}
.pill-lg { height: 2rem; padding: 0 0.75rem; font-size: 0.75rem; }
.tone-ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 32%, var(--transparent)); background: color-mix(in srgb, var(--ok) 12%, var(--transparent)); }
.tone-info { color: var(--info); border-color: color-mix(in srgb, var(--info) 32%, var(--transparent)); background: color-mix(in srgb, var(--info) 12%, var(--transparent)); }
.tone-staff { color: var(--staff); border-color: color-mix(in srgb, var(--staff) 32%, var(--transparent)); background: color-mix(in srgb, var(--staff) 12%, var(--transparent)); }
.tone-danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 32%, var(--transparent)); background: color-mix(in srgb, var(--danger) 12%, var(--transparent)); }
.tone-accent { color: var(--accent); border-color: var(--accent-line); background: var(--accent-tint); }
.tone-idle { color: var(--ink-muted); border-color: var(--line-strong); background: var(--inset); }
.dot {
  width: 0.4375rem; height: 0.4375rem; flex: none;
  border-radius: var(--r-pill); border: 0; background: currentColor;
}

/* ------------------------------------------------------- activity + health */
.panel-activity { display: flex; flex-direction: column; }
.chart {
  margin-top: 0.5rem; width: 100%; display: block;
  flex: 1 1 auto; min-height: 9rem;
}
.chart-empty {
  display: flex; align-items: center; justify-content: center; text-align: center;
  flex: 1 1 auto; min-height: 9rem; margin-top: 0.5rem; padding: 1rem;
  border: 1px dashed var(--line-strong); border-radius: var(--r-xl);
  color: var(--ink-muted); font-size: 0.8125rem;
}
.chart-legend {
  display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;
  font-size: 0.6875rem; color: var(--ink-faint);
}
.health-list { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.375rem; }
.health-row {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.5rem 0.75rem; border: 1px solid var(--line);
  border-radius: var(--r-lg); background: var(--inset); font-size: 0.8125rem;
}
.health-row .health-name { display: flex; align-items: center; gap: 0.5rem; color: var(--ink-soft); }
.health-row .health-state {
  font-weight: 700; background: none; border: 0; padding: 0;
}
.health-foot {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  margin-top: 0.875rem; font-size: 0.75rem; color: var(--ink-faint);
}
.probe-btn {
  display: inline-flex; align-items: center; gap: 0.375rem; cursor: pointer;
  padding: 0.25rem 0.5rem; border-radius: var(--r-md);
  border: 1px solid var(--line-strong); background: var(--inset);
  font-family: var(--font-mono); font-size: 0.6875rem; color: var(--ink-soft);
}
.probe-btn:hover { background: var(--panel-hover); color: var(--ink); }
.probe-btn .method { color: var(--ok); font-weight: 700; }

/* ---------------------------------------------------------------- cards */
.card {
  display: flex; flex-direction: column; gap: 0.375rem;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-xl); padding: 0.875rem 1rem;
  transition: background var(--speed) var(--ease), border-color var(--speed) var(--ease);
}
a.card:hover, .card:has(a:hover) { background: var(--panel-hover); border-color: var(--line-strong); }
.card-top { display: flex; align-items: flex-start; gap: 0.75rem; }
.card-icon {
  display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; flex: none; border-radius: var(--r-lg);
  border: 1px solid var(--line); background: var(--inset); color: var(--ink-soft);
}
.card-title { font-size: 0.875rem; font-weight: 700; }
.card-text { font-size: 0.75rem; color: var(--ink-muted); }
.card-action {
  display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;
  min-height: 1.5rem; font-size: 0.75rem; font-weight: 700; color: var(--accent);
}
.card-disabled { opacity: 0.72; }
.card-meta { margin-top: auto; padding-top: 0.5rem; display: flex; gap: 0.375rem; flex-wrap: wrap; }

/* ---------------------------------------------------------------- steps */
.steps { display: flex; flex-direction: column; gap: 0.875rem; }
.step { display: flex; gap: 0.75rem; }
.step-index {
  font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700;
  color: var(--accent); padding-top: 0.0625rem;
}
.step h3 { font-size: 0.8125rem; font-weight: 700; }
.step p { font-size: 0.75rem; color: var(--ink-muted); }

/* ---------------------------------------------------------------- console */
.console { display: flex; flex-direction: column; min-width: 0; }
.tabs {
  display: flex; align-items: center; gap: 0.25rem;
  border-bottom: 1px solid var(--line); padding: 0 0.25rem;
}
.tab {
  position: relative; padding: 0.5rem 0.625rem; cursor: pointer;
  background: none; border: 0; font-size: 0.8125rem; font-weight: 600;
  color: var(--ink-muted); border-bottom: 2px solid var(--transparent);
  margin-bottom: -1px;
}
.tab:hover { color: var(--ink); }
.tab[aria-selected="true"] { color: var(--accent); border-bottom-color: var(--accent); }
.tabs-spacer { margin-left: auto; }
.code {
  margin: 0; padding: 0.875rem 1rem; overflow-x: auto;
  font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.65;
  color: var(--ink-soft); background: var(--inset);
  border: 1px solid var(--line); border-radius: var(--r-lg);
  white-space: pre; tab-size: 2;
}
.code-scroll { max-height: 28rem; overflow-y: auto; }
.response-head {
  display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.playground-form { display: grid; gap: 0.75rem; }
.control { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.control small { font-size: 0.6875rem; color: var(--ink-faint); }
.input, .select {
  width: 100%; height: 2.25rem; padding: 0 0.625rem; min-width: 0;
  background: var(--inset); border: 1px solid var(--line-strong);
  border-radius: var(--r-lg); font-size: 0.8125rem; color: var(--ink);
}
.select {
  appearance: none; padding-right: 2rem;
  background-image: linear-gradient(var(--transparent), var(--transparent));
}
.select-wrap { position: relative; display: flex; align-items: center; }
.select-wrap .icon { position: absolute; right: 0.625rem; pointer-events: none; color: var(--ink-muted); }
.input:focus-visible, .select:focus-visible {
  border-color: var(--accent);
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.param-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.625rem; }
.playground-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.status-note { font-size: 0.75rem; color: var(--ink-muted); }

/* ---------------------------------------------------------------- table */
.filters { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.segmented {
  display: inline-flex; padding: 0.1875rem; gap: 0.1875rem;
  background: var(--inset); border: 1px solid var(--line); border-radius: var(--r-lg);
}
.segmented button {
  padding: 0.25rem 0.6875rem; border: 0; cursor: pointer; border-radius: var(--r-md);
  background: var(--transparent); color: var(--ink-muted);
  font-size: 0.75rem; font-weight: 700;
}
.segmented button:hover { color: var(--ink); }
.segmented button[aria-pressed="true"] { background: var(--accent-fill); color: var(--on-accent); }
.table-wrap {
  border: 1px solid var(--line); border-radius: var(--r-xl);
  background: var(--panel); overflow-x: auto;
}
table { width: 100%; border-collapse: collapse; min-width: 44rem; }
thead th {
  position: sticky; top: 0; text-align: left; padding: 0.625rem 1rem;
  font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--ink-faint);
  background: var(--panel); border-bottom: 1px solid var(--line);
}
tbody td { padding: 0.5625rem 1rem; border-bottom: 1px solid var(--line-soft); font-size: 0.8125rem; vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--panel-hover); }
td.path code, .mono { font-family: var(--font-mono); font-size: 0.75rem; color: var(--ink); }
td.purpose { color: var(--ink-muted); }
.method-tag {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 3.25rem; padding: 0.125rem 0.4375rem; border-radius: var(--r-sm);
  font-family: var(--font-mono); font-size: 0.6875rem; font-weight: 700;
}
.method-get { color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, var(--transparent)); }
.method-post { color: var(--info); background: color-mix(in srgb, var(--info) 12%, var(--transparent)); }
.method-put, .method-patch { color: var(--accent); background: var(--accent-tint); }
.method-delete { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, var(--transparent)); }
.table-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  flex-wrap: wrap; margin-top: 0.625rem; font-size: 0.75rem; color: var(--ink-faint);
}
.empty-row td { text-align: center; color: var(--ink-muted); padding: 1.75rem 1rem; }

/* ---------------------------------------------------------------- lists */
.fact-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.625rem; }
.fact {
  display: flex; align-items: flex-start; gap: 0.5rem;
  font-size: 0.75rem; color: var(--ink-muted);
}
.fact .icon-sm { color: var(--ok); margin-top: 0.1875rem; }
.fact-pair { display: flex; flex-direction: column; align-items: flex-start; gap: 0.1875rem; }
.fact-key {
  display: inline-flex; align-items: center; white-space: nowrap;
  padding: 0.0625rem 0.4375rem; border-radius: var(--r-sm);
  border: 1px solid var(--line-strong); background: var(--inset);
  font-family: var(--font-mono); font-size: 0.6875rem; font-weight: 700;
  color: var(--ink-soft);
}
.footer {
  margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--ink-faint);
}
.footer-brand { display: flex; align-items: center; gap: 0.625rem; }

/* ---------------------------------------------------------------- responsive */
@media (max-width: 1180px) {
  .grid-activity, .grid-request { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 1024px) {
  .drawer-toggle { display: inline-flex; }
  /* A closed drawer is off-screen, so it is also hidden from the tab order.
     Visibility is delayed on close and immediate on open, which keeps the
     slide-out animation and lets focus move into the panel right away. */
  .sidebar {
    position: fixed; top: var(--topbar-h); left: 0; z-index: 45;
    width: min(19rem, 84vw); background: var(--page);
    visibility: hidden; transform: translateX(-100%);
    transition:
      transform var(--speed) var(--ease),
      visibility 0s linear var(--speed);
  }
  body[data-drawer="open"] .sidebar {
    visibility: visible;
    transform: translateX(0);
    transition: transform var(--speed) var(--ease), visibility 0s;
  }
  .drawer-close { display: inline-flex; }
  body:not([data-drawer="open"]) .sidebar-scrim { display: none; }
  .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1025px) { .sidebar-scrim { display: none; } }
@media (max-width: 860px) {
  .topbar-search { order: 3; flex-basis: 100%; }
  .topbar { height: auto; padding: 0.5rem 0.875rem; flex-wrap: wrap; row-gap: 0.5rem; }
  /* The hero already states the version and environment on small screens. */
  .topbar-meta .meta-chip { display: none; }
  .topbar-meta { margin-left: auto; }
  .sidebar { top: 0; height: 100dvh; }
  .main { padding: 1.25rem 1rem 2.5rem; }
  .hero-side { align-items: stretch; }
  .hero-status { align-items: flex-start; }
}
@media (max-width: 640px) {
  .grid-4, .grid-3, .grid-2 { grid-template-columns: minmax(0, 1fr); }
  .param-grid { grid-template-columns: minmax(0, 1fr); }
  .btn { width: 100%; justify-content: center; }
  .playground-actions .btn { width: auto; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; }
}
`;
}
