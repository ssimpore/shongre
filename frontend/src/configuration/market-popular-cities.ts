import type { MarketCity } from "../domains/market/market.types";

/**
 * The towns a market's location picker offers first, and the candidates the
 * "use my position" flow labels a browser coordinate with.
 *
 * The API market projection carries detection bounds and a location
 * hierarchy, not a shortlist of towns; that shortlist is presentation data
 * and lives beside the coordinate table in `market-city-coordinates.ts`,
 * whose entries it must match: a popular city without a coordinate can be
 * chosen but never detected. Markets without an entry keep "whole country"
 * and free text entry, exactly as before.
 */
export const MARKET_POPULAR_CITIES: Readonly<
  Record<string, readonly MarketCity[]>
> = Object.freeze({
  FR: [
    {
      name: "Paris",
      postalCode: "75000",
      department: "75 - Paris",
      region: "Île-de-France",
    },
    {
      name: "Lyon",
      postalCode: "69000",
      department: "69 - Rhône",
      region: "Auvergne-Rhône-Alpes",
    },
    {
      name: "Marseille",
      postalCode: "13000",
      department: "13 - Bouches-du-Rhône",
      region: "Provence-Alpes-Côte d'Azur",
    },
    {
      name: "Toulouse",
      postalCode: "31000",
      department: "31 - Haute-Garonne",
      region: "Occitanie",
    },
    {
      name: "Bordeaux",
      postalCode: "33000",
      department: "33 - Gironde",
      region: "Nouvelle-Aquitaine",
    },
    {
      name: "Nantes",
      postalCode: "44000",
      department: "44 - Loire-Atlantique",
      region: "Pays de la Loire",
    },
    {
      name: "Lille",
      postalCode: "59000",
      department: "59 - Nord",
      region: "Hauts-de-France",
    },
    {
      name: "Strasbourg",
      postalCode: "67000",
      department: "67 - Bas-Rhin",
      region: "Grand Est",
    },
    {
      name: "Rennes",
      postalCode: "35000",
      department: "35 - Ille-et-Vilaine",
      region: "Bretagne",
    },
    {
      name: "Nice",
      postalCode: "06000",
      department: "06 - Alpes-Maritimes",
      region: "Provence-Alpes-Côte d'Azur",
    },
    {
      name: "Montpellier",
      postalCode: "34000",
      department: "34 - Hérault",
      region: "Occitanie",
    },
  ],
  BE: [
    { name: "Bruxelles", postalCode: "1000", region: "Bruxelles-Capitale" },
    { name: "Liège", postalCode: "4000", region: "Wallonie" },
    { name: "Namur", postalCode: "5000", region: "Wallonie" },
    { name: "Anvers", postalCode: "2000", region: "Flandre" },
    { name: "Gand", postalCode: "9000", region: "Flandre" },
    { name: "Charleroi", postalCode: "6000", region: "Wallonie" },
  ],
  CH: [
    { name: "Genève", postalCode: "1200", region: "Genève" },
    { name: "Lausanne", postalCode: "1000", region: "Vaud" },
    { name: "Zürich", postalCode: "8000", region: "Zürich" },
    { name: "Bâle", postalCode: "4000", region: "Bâle" },
    { name: "Berne", postalCode: "3000", region: "Berne" },
  ],
  LU: [
    { name: "Luxembourg-Ville", postalCode: "L-1110", region: "Luxembourg" },
    {
      name: "Esch-sur-Alzette",
      postalCode: "L-4001",
      region: "Esch-sur-Alzette",
    },
    { name: "Differdange", postalCode: "L-4501", region: "Esch-sur-Alzette" },
    { name: "Dudelange", postalCode: "L-3401", region: "Esch-sur-Alzette" },
  ],
  ES: [
    { name: "Madrid", postalCode: "28001", region: "Comunidad de Madrid" },
    { name: "Barcelona", postalCode: "08001", region: "Cataluña" },
    { name: "Valencia", postalCode: "46001", region: "Comunidad Valenciana" },
    { name: "Sevilla", postalCode: "41001", region: "Andalucía" },
    { name: "Málaga", postalCode: "29001", region: "Andalucía" },
  ],
});
