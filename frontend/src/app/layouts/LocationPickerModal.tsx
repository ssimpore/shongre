import React, { useState, useEffect } from 'react';
import { MapPin, Check, Navigation } from 'lucide-react';
import { Modal } from '../../design-system/primitives/Modal';
import { Button } from '../../design-system/primitives/Button';
import { Input } from '../../design-system/primitives/FormField';
import { useMarketLocation } from '../providers/MarketLocationProvider';
import { LocationSelection } from '../../types';
import { useTranslation } from '../../i18n/I18nProvider';

export const LocationPickerModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeMarket,
    location,
    setLocation,
    resetLocation,
    popularCities,
    isLocationModalOpen,
    closeLocationModal,
  } = useMarketLocation();

  const isWholeCountry = location.city.startsWith('Tout') || location.city.startsWith('Toute');
  const [cityInput, setCityInput] = useState(isWholeCountry ? '' : location.city);
  const [radius, setRadius] = useState<number>(location.radiusKm || 0);

  useEffect(() => {
    if (isWholeCountry) {
      setCityInput('');
    } else {
      setCityInput(location.city);
    }
  }, [location, isWholeCountry]);

  const radiusOptions = [0, 10, 20, 30, 50, 100];
  const wholeCountryLabel = `Toute la ${activeMarket.name}`;

  const handleApply = () => {
    if (!cityInput.trim()) {
      resetLocation();
    } else {
      const match = popularCities.find(
        (c) => c.name.toLowerCase() === cityInput.trim().toLowerCase()
      );
      const newLoc: LocationSelection = {
        city: cityInput.trim(),
        postalCode: match ? match.postalCode : '',
        department: match ? match.department : '',
        region: match ? match.region : '',
        radiusKm: radius,
        label: radius > 0 ? `${cityInput.trim()} (+${radius} km)` : cityInput.trim(),
      };
      setLocation(newLoc);
    }
    closeLocationModal();
  };

  const handleSelectCity = (c: typeof popularCities[0]) => {
    setCityInput(c.name);
  };

  const examplePlaceholder =
    popularCities.length >= 2
      ? `ex: ${popularCities[0].name}, ${popularCities[1].name}, ${popularCities[0].postalCode}...`
      : 'ex: Paris, Lyon, 75001...';

  return (
    <Modal
      isOpen={isLocationModalOpen}
      onClose={closeLocationModal}
      title={t('shell.locationPickerModal.zoneGeographique')}
      description={`Trouvez des annonces près de chez vous ou partout en ${activeMarket.name} (${activeMarket.flag})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Whole country option */}
        <button
          type="button"
          onClick={() => {
            resetLocation();
            closeLocationModal();
          }}
          className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
            isWholeCountry
              ? 'border-primary bg-primary-light text-primary font-bold'
              : 'border-border-base hover:border-stone-400 bg-white text-stone-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm">{wholeCountryLabel}</span>
          </div>
          {isWholeCountry && <Check className="w-4 h-4 text-primary shrink-0" />}
        </button>

        {/* City input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Ville ou Code Postal ({activeMarket.name})
          </label>
          <Input
            placeholder={examplePlaceholder}
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4" />}
          />
        </div>

        {/* Radius selector */}
        {cityInput.trim() && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex justify-between">
              <span>{t('shell.locationPickerModal.rayonDeRecherche')}</span>
              <span className="text-primary font-semibold">
                {radius === 0 ? 'Ville exacte' : `+ ${radius} km`}
              </span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    radius === r
                      ? 'bg-primary text-white border-primary'
                      : 'bg-stone-50 border-border-base text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {r === 0 ? 'Exact' : `${r}km`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Cities in Active Market */}
        {popularCities.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-micro font-bold text-stone-400 uppercase tracking-wider">
              Villes populaires ({activeMarket.name})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularCities.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    cityInput.toLowerCase() === city.name.toLowerCase()
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white border-border-base text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={closeLocationModal}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            Appliquer la zone
          </Button>
        </div>
      </div>
    </Modal>
  );
};
