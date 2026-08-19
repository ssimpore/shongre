import { describe, it, expect } from 'vitest';
import {
  resolveTitle,
  resolveCanonical,
  buildBreadcrumbSchema,
  DEFAULT_TITLE,
  SITE_NAME,
} from './seo.service';

describe('resolveTitle', () => {
  it('brands a page title', () => {
    expect(resolveTitle('Vélos à Bordeaux')).toBe(`Vélos à Bordeaux | ${SITE_NAME}`);
  });

  // Listing detail builds its own branded title, and a blind append produced
  // "… | Shongre | Shongre" in the tab and in every shared link.
  it.each(['Peugeot 208 - 15400 € | Shongre', 'Atelier Nordique — Shongre', 'Boutique - shongre'])(
    'leaves an already-branded title alone: %s',
    (title) => {
      expect(resolveTitle(title)).toBe(title);
    },
  );

  it('falls back to the site title when a page has none', () => {
    expect(resolveTitle()).toBe(DEFAULT_TITLE);
    expect(resolveTitle('   ')).toBe(DEFAULT_TITLE);
  });
});

describe('resolveCanonical', () => {
  const origin = 'https://www.shongre.com';

  it('builds an absolute URL from a path', () => {
    expect(resolveCanonical('/recherche', origin)).toBe(`${origin}/recherche`);
  });

  // Search state lives entirely in the query string, so every filter permutation
  // would otherwise declare itself a separate canonical page.
  it('drops the query string and hash', () => {
    expect(resolveCanonical('/recherche?query=velo&page=3', origin)).toBe(`${origin}/recherche`);
    expect(resolveCanonical('/aide#livraison', origin)).toBe(`${origin}/aide`);
  });

  it('normalises slashes without collapsing the root', () => {
    expect(resolveCanonical('/annonce/list-117/', origin)).toBe(`${origin}/annonce/list-117`);
    expect(resolveCanonical('categories', origin)).toBe(`${origin}/categories`);
    expect(resolveCanonical('/', origin)).toBe(`${origin}/`);
    expect(resolveCanonical('/', `${origin}/`)).toBe(`${origin}/`);
  });
});

describe('buildBreadcrumbSchema', () => {
  const origin = 'https://www.shongre.com';

  it('numbers the trail from one and resolves each item', () => {
    const schema = buildBreadcrumbSchema(
      [
        { name: 'Accueil', path: '/' },
        { name: 'Véhicules', path: '/categorie/vehicules' },
        { name: 'Peugeot 208' },
      ],
      origin,
    );

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origin}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Véhicules',
        item: `${origin}/categorie/vehicules`,
      },
      // The current page carries no `item` — it is where the user already is.
      { '@type': 'ListItem', position: 3, name: 'Peugeot 208' },
    ]);
  });
});
