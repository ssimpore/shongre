import { test } from '@playwright/test';
import { ALL_ROUTES } from './routes';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

const WIDTHS = [
  { name: '375', width: 375, height: 812 },
  { name: '787', width: 787, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
];

const audit = () => {
  const describe = (el: Element): string => {
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && depth < 3) {
      let part = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(`${part}#${node.id}`); break; }
      const cls = (node.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
      if (cls) part += `.${cls}`;
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }
    return parts.join('>');
  };
  const label = (el: Element): string =>
    (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('title') || '').trim().slice(0, 40).replace(/\s+/g, ' ');

  const SEL = 'a[href],button,input,select,textarea,[role="button"],[role="link"],[role="tab"],[role="switch"],[role="checkbox"],[tabindex]:not([tabindex="-1"])';
  const findings: any[] = [];
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  for (const el of Array.from(document.querySelectorAll(SEL))) {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') continue;
    if ((el as HTMLElement).offsetParent === null && st.position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.hasAttribute('disabled')) continue;

    // 1. touch target size (WCAG 2.2 AA 2.5.8 = 24x24 minimum)
    if (r.width < 24 || r.height < 24) {
      const inline = el.closest('p,li,span[class*="prose"]');
      if (!inline) findings.push({ kind: 'touch-target', sel: describe(el), label: label(el), w: Math.round(r.width), h: Math.round(r.height) });
    }

    // 2. occlusion: centre of the control belongs to something else entirely
    if (r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
        findings.push({ kind: 'occluded', sel: describe(el), label: label(el), by: describe(hit), at: [Math.round(cx), Math.round(cy)] });
      }
    }
  }

  // 3. fixed/sticky overlays and what they sit on top of
  const overlays: any[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const st = getComputedStyle(el);
    if (st.position !== 'fixed' && st.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 8) continue;
    overlays.push({ sel: describe(el), pos: st.position, z: st.zIndex, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) });
  }
  return { findings, overlays, vw, vh };
};

for (const vp of WIDTHS) {
  for (const route of ALL_ROUTES) {
    test(`probe ${route.name} @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await usePersona(page, route.persona);
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await waitForStableLayout(page);
      const res = await page.evaluate(audit);
      if (res.findings.length) {
        console.log(`\n### ${route.name} @${vp.name}`);
        for (const f of res.findings) console.log('   ' + JSON.stringify(f));
      }
    });
  }
}
