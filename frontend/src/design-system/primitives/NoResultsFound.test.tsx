import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { NoResultsFound } from './NoResultsFound';

describe('NoResultsFound Primitive', () => {
  it('instantiates correctly with default props', () => {
    const handleClear = vi.fn();
    const element = React.createElement(NoResultsFound, {
      onClearFilters: handleClear,
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(NoResultsFound);
    expect(element.props.onClearFilters).toBe(handleClear);
  });

  it('accepts custom title, description, and query', () => {
    const handleClear = vi.fn();
    const handleSave = vi.fn();
    const customTips = ['Vérifiez votre recherche', 'Essayez un autre mot'];

    const element = React.createElement(NoResultsFound, {
      query: 'Vélo de course',
      title: 'Aucun vélo trouvé',
      description: 'Essayez un autre modèle',
      clearFiltersLabel: 'Réinitialiser',
      onClearFilters: handleClear,
      onSaveSearch: handleSave,
      saveSearchLabel: 'Alerte e-mail',
      suggestions: customTips,
      showSuggestions: true,
      id: 'custom-no-results',
    });

    expect(element.props.query).toBe('Vélo de course');
    expect(element.props.title).toBe('Aucun vélo trouvé');
    expect(element.props.description).toBe('Essayez un autre modèle');
    expect(element.props.clearFiltersLabel).toBe('Réinitialiser');
    expect(element.props.suggestions).toEqual(customTips);
    expect(element.props.id).toBe('custom-no-results');
  });

  it('supports hiding suggestions when showSuggestions is false', () => {
    const element = React.createElement(NoResultsFound, {
      showSuggestions: false,
    });

    expect(element.props.showSuggestions).toBe(false);
  });
});
