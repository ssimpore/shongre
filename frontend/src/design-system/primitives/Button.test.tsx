import { describe, it, expect } from 'vitest';
import React from 'react';
import { Button } from './Button';

/**
 * A caller's display utility has to beat the primitive's default.
 *
 * Tailwind resolves conflicting utilities by stylesheet order, not by the order
 * they appear in the class attribute, and `.inline-flex` is emitted after
 * `.hidden`. So `<Button className="hidden sm:inline-flex">` still computed to
 * `display: flex`: the seller header's "Suivre" action was meant to disappear
 * below `sm` and instead stayed, pushing the action row past the card it lives
 * in — clipped by an ancestor's `overflow-hidden`, which is why the page-level
 * overflow suite never caught it.
 *
 * `FavoriteButton` carries the same guard for `position`; this is the display
 * equivalent, asserted so the base class cannot silently reclaim precedence.
 */
const classesOf = (element: React.ReactElement): string => {
  const rendered = (Button as unknown as (props: unknown) => React.ReactElement)(element.props);
  const walk = (node: unknown): string => {
    const candidate = node as { props?: { className?: string; children?: unknown } };
    if (candidate?.props?.className) return candidate.props.className;
    if (candidate?.props?.children) return walk(candidate.props.children);
    return '';
  };
  return walk(rendered);
};

describe('Button display utilities', () => {
  it('drops its own inline-flex when the caller sets a display', () => {
    const classes = classesOf(<Button className="hidden sm:inline-flex">Suivre</Button>);

    expect(classes).toContain('hidden');
    expect(classes.split(/\s+/)).not.toContain('inline-flex');
  });

  it.each(['hidden', 'block', 'flex', 'grid', 'inline-block'])(
    'yields to a caller-supplied `%s`',
    (display) => {
      const classes = classesOf(<Button className={display}>Label</Button>);
      expect(classes.split(/\s+/)).not.toContain('inline-flex');
    },
  );

  // Responsive-only display utilities are not a base-layer conflict, so the
  // default must stay — otherwise the button has no display at all below `sm`.
  it('keeps inline-flex when the caller only sets a responsive display', () => {
    const classes = classesOf(<Button className="sm:block">Label</Button>);
    expect(classes.split(/\s+/)).toContain('inline-flex');
  });

  it('keeps inline-flex when the caller sets unrelated classes', () => {
    const classes = classesOf(<Button className="flex-1 min-w-0 font-bold">Label</Button>);
    expect(classes.split(/\s+/)).toContain('inline-flex');
  });
});
