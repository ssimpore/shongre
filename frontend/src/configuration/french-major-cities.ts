/**
 * The largest French communes, as the map surfaces centre on them and the
 * nearest-town label reads them. Kept apart from `geoCoordinates.ts` so the
 * market provider, which needs only this table, does not drag the shared
 * gazetteer that module imports into the hydration bundle.
 */
export interface CityCoordinates {
  lat: number;
  lng: number;
  name: string;
  department?: string;
  zoom?: number;
}

export const FRENCH_MAJOR_CITIES: Record<string, CityCoordinates> = {
  paris: { lat: 48.8566, lng: 2.3522, name: "Paris", zoom: 12 },
  lyon: { lat: 45.764, lng: 4.8357, name: "Lyon", zoom: 12 },
  marseille: { lat: 43.2965, lng: 5.3698, name: "Marseille", zoom: 12 },
  bordeaux: { lat: 44.8378, lng: -0.5792, name: "Bordeaux", zoom: 12 },
  toulouse: { lat: 43.6047, lng: 1.4442, name: "Toulouse", zoom: 12 },
  nantes: { lat: 47.2184, lng: -1.5536, name: "Nantes", zoom: 12 },
  lille: { lat: 50.6292, lng: 3.0573, name: "Lille", zoom: 12 },
  strasbourg: { lat: 48.5734, lng: 7.7521, name: "Strasbourg", zoom: 12 },
  nice: { lat: 43.7102, lng: 7.262, name: "Nice", zoom: 12 },
  rennes: { lat: 48.1173, lng: -1.6778, name: "Rennes", zoom: 12 },
  montpellier: { lat: 43.6108, lng: 3.8767, name: "Montpellier", zoom: 12 },
  grenoble: { lat: 45.1885, lng: 5.7245, name: "Grenoble", zoom: 12 },
  rouen: { lat: 49.4432, lng: 1.0999, name: "Rouen", zoom: 12 },
  reims: { lat: 49.2583, lng: 4.0317, name: "Reims", zoom: 12 },
  toulon: { lat: 43.1242, lng: 5.928, name: "Toulon", zoom: 12 },
  angers: { lat: 47.4784, lng: -0.5632, name: "Angers", zoom: 12 },
  dijon: { lat: 47.322, lng: 5.0415, name: "Dijon", zoom: 12 },
  brest: { lat: 48.3904, lng: -4.4861, name: "Brest", zoom: 12 },
  "clermont-ferrand": {
    lat: 45.7772,
    lng: 3.087,
    name: "Clermont-Ferrand",
    zoom: 12,
  },
  tours: { lat: 47.3941, lng: 0.6848, name: "Tours", zoom: 12 },
  amiens: { lat: 49.8941, lng: 2.2958, name: "Amiens", zoom: 12 },
  limoges: { lat: 45.8336, lng: 1.2611, name: "Limoges", zoom: 12 },
  metz: { lat: 49.1193, lng: 6.1757, name: "Metz", zoom: 12 },
  besancon: { lat: 47.2378, lng: 6.0241, name: "Besançon", zoom: 12 },
  orleans: { lat: 47.9029, lng: 1.9093, name: "Orléans", zoom: 12 },
  caen: { lat: 49.1829, lng: -0.3707, name: "Caen", zoom: 12 },
  perpignan: { lat: 42.6886, lng: 2.8948, name: "Perpignan", zoom: 12 },
  bayonne: { lat: 43.4929, lng: -1.4748, name: "Bayonne", zoom: 12 },
  annecy: { lat: 45.8992, lng: 6.1294, name: "Annecy", zoom: 12 },
  avignon: { lat: 43.9493, lng: 4.8055, name: "Avignon", zoom: 12 },
  poitiers: { lat: 46.5802, lng: 0.3404, name: "Poitiers", zoom: 12 },
  larochelle: { lat: 46.1603, lng: -1.1511, name: "La Rochelle", zoom: 12 },
  biarritz: { lat: 43.4832, lng: -1.5586, name: "Biarritz", zoom: 12 },
  ecully: { lat: 45.7746, lng: 4.778, name: "Écully", zoom: 12 },
  "saint-priest": {
    lat: 45.696,
    lng: 4.9447,
    name: "Saint-Priest",
    zoom: 12,
  },
  villeurbanne: { lat: 45.7679, lng: 4.8797, name: "Villeurbanne", zoom: 12 },
  "boulogne-billancourt": {
    lat: 48.8352,
    lng: 2.2409,
    name: "Boulogne-Billancourt",
    zoom: 12,
  },
};
