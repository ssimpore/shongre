import { describe, it, expect } from 'vitest';
import React from 'react';
import { LanguageSelector, SUPPORTED_LANGUAGES } from './LanguageSelector';

describe('LanguageSelector Primitive', () => {
  it('instantiates correctly as a React component element', () => {
    const element = React.createElement(LanguageSelector, {
      variant: 'header',
      idPrefix: 'test-lang',
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(LanguageSelector);
    expect(element.props.variant).toBe('header');
  });

  it('provides comprehensive list of European languages with flags', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(4);
    
    const french = SUPPORTED_LANGUAGES.find((l) => l.code === 'fr-FR');
    expect(french).toBeDefined();
    expect(french?.flag).toBe('🇫🇷');

    const english = SUPPORTED_LANGUAGES.find((l) => l.code === 'en-US');
    expect(english).toBeDefined();
    expect(english?.flag).toBe('🇬🇧');

    const german = SUPPORTED_LANGUAGES.find((l) => l.code === 'de-DE');
    expect(german).toBeDefined();
    expect(german?.flag).toBe('🇩🇪');

    const spanish = SUPPORTED_LANGUAGES.find((l) => l.code === 'es-ES');
    expect(spanish).toBeDefined();
    expect(spanish?.flag).toBe('🇪🇸');
  });
});
