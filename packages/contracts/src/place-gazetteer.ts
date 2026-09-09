/**
 * Turning a town into a point, without a geocoding provider.
 *
 * Most listings publish a town and a postcode and no coordinate: a seller types
 * where they are and nothing resolves it, because `maps.geocode` is a declared
 * capability that has not been built. The consequence on a detail page is a
 * heading, a place name, and an empty rectangle where the map belongs.
 *
 * A town is a location, so this resolves one. What it deliberately does not do
 * is guess: an unknown place answers `null` rather than the centre of the
 * market, because a listing in the Basque Country drawn near Paris is worse
 * than no map at all — it is an answer, and it is wrong.
 *
 * This is a bootstrap, not a gazetteer. It covers the largest communes of each
 * market and the towns the catalogue actually uses; a listing from a village
 * still gets no map. The durable answer is the geocoding provider the platform
 * inventory already declares, resolving once at publication and storing the
 * point on the row — at which point this becomes the fallback for the gaps
 * rather than the mechanism.
 *
 * It lives in contracts because the backend projects it into the public payload
 * and the Web client needs the same answer for vertical entities that carry no
 * coordinate of their own. One dataset, one rule, two readers.
 */

export interface GazetteerPoint {
  latitude: number;
  longitude: number;
}

export interface ResolvedPlace extends GazetteerPoint {
  /**
   * Always `city`. A town centre is a town-sized answer, and publishing it as
   * anything finer would turn "somewhere in Nantes" into "this street in
   * Nantes".
   */
  precision: "city";
}

/**
 * Keyed by the slug of the town name. Arrondissements resolve through their
 * own entries where the difference matters (Paris and Lyon are wider than the
 * disc drawn over them); elsewhere the commune centre is close enough at town
 * scale.
 */
const FR: Readonly<Record<string, GazetteerPoint>> = {
  paris: { latitude: 48.8566, longitude: 2.3522 },
  "paris-1er": { latitude: 48.8626, longitude: 2.3363 },
  "paris-2e": { latitude: 48.8697, longitude: 2.3412 },
  "paris-3e": { latitude: 48.8637, longitude: 2.3615 },
  "paris-4e": { latitude: 48.8546, longitude: 2.3572 },
  "paris-5e": { latitude: 48.8448, longitude: 2.3471 },
  "paris-6e": { latitude: 48.849, longitude: 2.3327 },
  "paris-7e": { latitude: 48.8565, longitude: 2.312 },
  "paris-8e": { latitude: 48.8763, longitude: 2.3183 },
  "paris-9e": { latitude: 48.8768, longitude: 2.3376 },
  "paris-10e": { latitude: 48.8761, longitude: 2.3591 },
  "paris-11e": { latitude: 48.8578, longitude: 2.3795 },
  "paris-12e": { latitude: 48.8351, longitude: 2.4212 },
  "paris-13e": { latitude: 48.8322, longitude: 2.3561 },
  "paris-14e": { latitude: 48.8298, longitude: 2.3265 },
  "paris-15e": { latitude: 48.8412, longitude: 2.3003 },
  "paris-16e": { latitude: 48.8637, longitude: 2.2769 },
  "paris-17e": { latitude: 48.8872, longitude: 2.3078 },
  "paris-18e": { latitude: 48.8925, longitude: 2.3444 },
  "paris-19e": { latitude: 48.8817, longitude: 2.3822 },
  "paris-20e": { latitude: 48.8631, longitude: 2.3985 },
  lyon: { latitude: 45.764, longitude: 4.8357 },
  "lyon-1er": { latitude: 45.7708, longitude: 4.8332 },
  "lyon-2e": { latitude: 45.7485, longitude: 4.8268 },
  "lyon-3e": { latitude: 45.7602, longitude: 4.8564 },
  "lyon-4e": { latitude: 45.7772, longitude: 4.8285 },
  "lyon-5e": { latitude: 45.7578, longitude: 4.8082 },
  "lyon-6e": { latitude: 45.7714, longitude: 4.8494 },
  "lyon-7e": { latitude: 45.7421, longitude: 4.8419 },
  "lyon-8e": { latitude: 45.7357, longitude: 4.8663 },
  "lyon-9e": { latitude: 45.7787, longitude: 4.8064 },
  marseille: { latitude: 43.2965, longitude: 5.3698 },
  "marseille-1er": { latitude: 43.3009, longitude: 5.3806 },
  "marseille-2e": { latitude: 43.3082, longitude: 5.3646 },
  "marseille-6e": { latitude: 43.288, longitude: 5.3803 },
  "marseille-7e": { latitude: 43.2871, longitude: 5.3562 },
  "marseille-8e": { latitude: 43.2703, longitude: 5.3806 },
  toulouse: { latitude: 43.6047, longitude: 1.4442 },
  nice: { latitude: 43.7102, longitude: 7.262 },
  nantes: { latitude: 47.2184, longitude: -1.5536 },
  montpellier: { latitude: 43.6108, longitude: 3.8767 },
  strasbourg: { latitude: 48.5734, longitude: 7.7521 },
  bordeaux: { latitude: 44.8378, longitude: -0.5792 },
  lille: { latitude: 50.6292, longitude: 3.0573 },
  rennes: { latitude: 48.1173, longitude: -1.6778 },
  reims: { latitude: 49.2583, longitude: 4.0317 },
  "saint-etienne": { latitude: 45.4397, longitude: 4.3872 },
  toulon: { latitude: 43.1242, longitude: 5.928 },
  "le-havre": { latitude: 49.4944, longitude: 0.1079 },
  grenoble: { latitude: 45.1885, longitude: 5.7245 },
  dijon: { latitude: 47.322, longitude: 5.0415 },
  angers: { latitude: 47.4784, longitude: -0.5632 },
  nimes: { latitude: 43.8367, longitude: 4.3601 },
  villeurbanne: { latitude: 45.7679, longitude: 4.8797 },
  "clermont-ferrand": { latitude: 45.7772, longitude: 3.087 },
  "le-mans": { latitude: 48.0061, longitude: 0.1996 },
  "aix-en-provence": { latitude: 43.5297, longitude: 5.4474 },
  brest: { latitude: 48.3904, longitude: -4.4861 },
  tours: { latitude: 47.3941, longitude: 0.6848 },
  amiens: { latitude: 49.8941, longitude: 2.2958 },
  limoges: { latitude: 45.8336, longitude: 1.2611 },
  annecy: { latitude: 45.8992, longitude: 6.1294 },
  perpignan: { latitude: 42.6886, longitude: 2.8948 },
  besancon: { latitude: 47.2378, longitude: 6.0241 },
  metz: { latitude: 49.1193, longitude: 6.1757 },
  orleans: { latitude: 47.9029, longitude: 1.9093 },
  rouen: { latitude: 49.4432, longitude: 1.0999 },
  mulhouse: { latitude: 47.7508, longitude: 7.3359 },
  caen: { latitude: 49.1829, longitude: -0.3707 },
  nancy: { latitude: 48.6921, longitude: 6.1844 },
  "boulogne-billancourt": { latitude: 48.8352, longitude: 2.2409 },
  argenteuil: { latitude: 48.9472, longitude: 2.2467 },
  "saint-denis": { latitude: 48.9362, longitude: 2.3574 },
  roubaix: { latitude: 50.6942, longitude: 3.1746 },
  tourcoing: { latitude: 50.7236, longitude: 3.1611 },
  nanterre: { latitude: 48.8924, longitude: 2.2069 },
  avignon: { latitude: 43.9493, longitude: 4.8055 },
  poitiers: { latitude: 46.5802, longitude: 0.3404 },
  "la-rochelle": { latitude: 46.1603, longitude: -1.1511 },
  larochelle: { latitude: 46.1603, longitude: -1.1511 },
  versailles: { latitude: 48.8014, longitude: 2.1301 },
  courbevoie: { latitude: 48.8971, longitude: 2.2569 },
  colombes: { latitude: 48.9236, longitude: 2.2522 },
  "aulnay-sous-bois": { latitude: 48.9386, longitude: 2.4941 },
  "asnieres-sur-seine": { latitude: 48.9166, longitude: 2.2851 },
  rueil: { latitude: 48.8768, longitude: 2.1809 },
  "rueil-malmaison": { latitude: 48.8768, longitude: 2.1809 },
  pau: { latitude: 43.2951, longitude: -0.3708 },
  bayonne: { latitude: 43.4929, longitude: -1.4748 },
  biarritz: { latitude: 43.4832, longitude: -1.5586 },
  anglet: { latitude: 43.485, longitude: -1.5187 },
  ajaccio: { latitude: 41.9192, longitude: 8.7386 },
  bastia: { latitude: 42.7028, longitude: 9.4508 },
  calais: { latitude: 50.9513, longitude: 1.8587 },
  dunkerque: { latitude: 51.0343, longitude: 2.3768 },
  "saint-nazaire": { latitude: 47.2735, longitude: -2.2134 },
  quimper: { latitude: 47.9959, longitude: -4.0969 },
  lorient: { latitude: 47.7483, longitude: -3.3702 },
  vannes: { latitude: 47.6582, longitude: -2.7608 },
  "saint-malo": { latitude: 48.6493, longitude: -2.0257 },
  cherbourg: { latitude: 49.6386, longitude: -1.6164 },
  troyes: { latitude: 48.2973, longitude: 4.0744 },
  chambery: { latitude: 45.5646, longitude: 5.9178 },
  valence: { latitude: 44.9334, longitude: 4.8924 },
  ecully: { latitude: 45.7746, longitude: 4.778 },
  "saint-priest": { latitude: 45.696, longitude: 4.9447 },
  venissieux: { latitude: 45.6974, longitude: 4.8862 },
  "vaulx-en-velin": { latitude: 45.7768, longitude: 4.9186 },
  bron: { latitude: 45.7382, longitude: 4.9114 },
  antibes: { latitude: 43.5808, longitude: 7.1251 },
  cannes: { latitude: 43.5528, longitude: 7.0174 },
  "la-seyne-sur-mer": { latitude: 43.1024, longitude: 5.883 },
  hyeres: { latitude: 43.1204, longitude: 6.1286 },
  arles: { latitude: 43.6768, longitude: 4.6277 },
  narbonne: { latitude: 43.1836, longitude: 3.0035 },
  beziers: { latitude: 43.3448, longitude: 3.2158 },
  carcassonne: { latitude: 43.2131, longitude: 2.3491 },
  albi: { latitude: 43.9298, longitude: 2.1479 },
  montauban: { latitude: 44.0221, longitude: 1.3529 },
  agen: { latitude: 44.2024, longitude: 0.6212 },
  angouleme: { latitude: 45.6484, longitude: 0.1562 },
  niort: { latitude: 46.3239, longitude: -0.4644 },
  "la-roche-sur-yon": { latitude: 46.6705, longitude: -1.4269 },
  cholet: { latitude: 47.0594, longitude: -0.8797 },
  laval: { latitude: 48.0698, longitude: -0.7669 },
  chartres: { latitude: 48.4439, longitude: 1.4894 },
  bourges: { latitude: 47.0811, longitude: 2.3988 },
  blois: { latitude: 47.586, longitude: 1.3359 },
  auxerre: { latitude: 47.7982, longitude: 3.5731 },
  nevers: { latitude: 46.9896, longitude: 3.1629 },
  "chalon-sur-saone": { latitude: 46.7806, longitude: 4.8535 },
  macon: { latitude: 46.3062, longitude: 4.8287 },
  "bourg-en-bresse": { latitude: 46.2051, longitude: 5.2258 },
  roanne: { latitude: 46.0367, longitude: 4.0682 },
  vichy: { latitude: 46.1271, longitude: 3.4262 },
  montlucon: { latitude: 46.3405, longitude: 2.6023 },
  aurillac: { latitude: 44.9257, longitude: 2.4406 },
  rodez: { latitude: 44.3506, longitude: 2.5731 },
  cahors: { latitude: 44.4475, longitude: 1.4408 },
  tarbes: { latitude: 43.2328, longitude: 0.0781 },
  "mont-de-marsan": { latitude: 43.8914, longitude: -0.4994 },
  dax: { latitude: 43.7102, longitude: -1.0533 },
  arcachon: { latitude: 44.6588, longitude: -1.1683 },
  libourne: { latitude: 44.9138, longitude: -0.2419 },
  perigueux: { latitude: 45.1841, longitude: 0.7212 },
  brive: { latitude: 45.1591, longitude: 1.5331 },
  "brive-la-gaillarde": { latitude: 45.1591, longitude: 1.5331 },
  "le-puy-en-velay": { latitude: 45.0428, longitude: 3.8853 },
  annemasse: { latitude: 46.1936, longitude: 6.2354 },
  thonon: { latitude: 46.371, longitude: 6.4794 },
  "thonon-les-bains": { latitude: 46.371, longitude: 6.4794 },
  belfort: { latitude: 47.6379, longitude: 6.8629 },
  colmar: { latitude: 48.0794, longitude: 7.3585 },
  haguenau: { latitude: 48.8155, longitude: 7.7903 },
  epinal: { latitude: 48.1746, longitude: 6.4494 },
  thionville: { latitude: 49.3579, longitude: 6.1687 },
  "charleville-mezieres": { latitude: 49.7729, longitude: 4.7204 },
  "saint-quentin": { latitude: 49.8486, longitude: 3.2865 },
  compiegne: { latitude: 49.4179, longitude: 2.8261 },
  beauvais: { latitude: 49.4295, longitude: 2.0807 },
  evreux: { latitude: 49.0241, longitude: 1.1508 },
  "le-mont-saint-michel": { latitude: 48.636, longitude: -1.5115 },
  bergerac: { latitude: 44.8514, longitude: 0.4815 },
  "les-mathes": { latitude: 45.7085, longitude: -1.1493 },
  royan: { latitude: 45.6284, longitude: -1.0281 },
  "saint-jean-de-luz": { latitude: 43.3886, longitude: -1.6592 },
  hendaye: { latitude: 43.3586, longitude: -1.7746 },
  sete: { latitude: 43.4053, longitude: 3.6971 },
  menton: { latitude: 43.7749, longitude: 7.4964 },
  fontainebleau: { latitude: 48.4043, longitude: 2.7017 },
  meaux: { latitude: 48.9601, longitude: 2.8783 },
  melun: { latitude: 48.5395, longitude: 2.6605 },
  evry: { latitude: 48.6299, longitude: 2.4409 },
  massy: { latitude: 48.7307, longitude: 2.2831 },
  cergy: { latitude: 49.0361, longitude: 2.0631 },
  pontoise: { latitude: 49.0507, longitude: 2.0997 },
  creteil: { latitude: 48.7904, longitude: 2.4556 },
  vincennes: { latitude: 48.8478, longitude: 2.4392 },
  montreuil: { latitude: 48.8638, longitude: 2.4485 },
  "levallois-perret": { latitude: 48.8938, longitude: 2.2879 },
  "issy-les-moulineaux": { latitude: 48.8244, longitude: 2.2697 },
  "saint-germain-en-laye": { latitude: 48.8988, longitude: 2.0937 },
  "neuilly-sur-seine": { latitude: 48.8846, longitude: 2.2686 },
};

const BE: Readonly<Record<string, GazetteerPoint>> = {
  bruxelles: { latitude: 50.8503, longitude: 4.3517 },
  brussel: { latitude: 50.8503, longitude: 4.3517 },
  anvers: { latitude: 51.2194, longitude: 4.4025 },
  antwerpen: { latitude: 51.2194, longitude: 4.4025 },
  gand: { latitude: 51.0543, longitude: 3.7174 },
  gent: { latitude: 51.0543, longitude: 3.7174 },
  charleroi: { latitude: 50.4108, longitude: 4.4446 },
  liege: { latitude: 50.6326, longitude: 5.5797 },
  bruges: { latitude: 51.2093, longitude: 3.2247 },
  brugge: { latitude: 51.2093, longitude: 3.2247 },
  namur: { latitude: 50.4674, longitude: 4.872 },
  louvain: { latitude: 50.8798, longitude: 4.7005 },
  leuven: { latitude: 50.8798, longitude: 4.7005 },
  mons: { latitude: 50.4542, longitude: 3.9564 },
  tournai: { latitude: 50.6071, longitude: 3.3891 },
  ostende: { latitude: 51.2247, longitude: 2.9107 },
  arlon: { latitude: 49.6839, longitude: 5.8158 },
  wavre: { latitude: 50.7167, longitude: 4.6083 },
};

const CH: Readonly<Record<string, GazetteerPoint>> = {
  zurich: { latitude: 47.3769, longitude: 8.5417 },
  geneve: { latitude: 46.2044, longitude: 6.1432 },
  bale: { latitude: 47.5596, longitude: 7.5886 },
  basel: { latitude: 47.5596, longitude: 7.5886 },
  lausanne: { latitude: 46.5197, longitude: 6.6323 },
  berne: { latitude: 46.948, longitude: 7.4474 },
  bern: { latitude: 46.948, longitude: 7.4474 },
  winterthour: { latitude: 47.5001, longitude: 8.7241 },
  lucerne: { latitude: 47.0502, longitude: 8.3093 },
  "saint-gall": { latitude: 47.4245, longitude: 9.3767 },
  lugano: { latitude: 46.0037, longitude: 8.9511 },
  bienne: { latitude: 47.1368, longitude: 7.2467 },
  fribourg: { latitude: 46.8065, longitude: 7.1615 },
  neuchatel: { latitude: 46.9924, longitude: 6.931 },
  sion: { latitude: 46.2331, longitude: 7.3606 },
  montreux: { latitude: 46.4312, longitude: 6.9107 },
  vevey: { latitude: 46.4628, longitude: 6.8419 },
  nyon: { latitude: 46.3833, longitude: 6.2394 },
};

const LU: Readonly<Record<string, GazetteerPoint>> = {
  luxembourg: { latitude: 49.6116, longitude: 6.1319 },
  "esch-sur-alzette": { latitude: 49.4958, longitude: 5.9806 },
  differdange: { latitude: 49.5242, longitude: 5.8917 },
  dudelange: { latitude: 49.4808, longitude: 6.0875 },
};

const SN: Readonly<Record<string, GazetteerPoint>> = {
  dakar: { latitude: 14.7167, longitude: -17.4677 },
  thies: { latitude: 14.7886, longitude: -16.9246 },
  "saint-louis": { latitude: 16.0179, longitude: -16.4896 },
  kaolack: { latitude: 14.1652, longitude: -16.0726 },
  ziguinchor: { latitude: 12.5833, longitude: -16.2719 },
  touba: { latitude: 14.85, longitude: -15.8833 },
  mbour: { latitude: 14.4198, longitude: -16.9646 },
  rufisque: { latitude: 14.7156, longitude: -17.2736 },
  diourbel: { latitude: 14.6553, longitude: -16.2314 },
  louga: { latitude: 15.6144, longitude: -16.2264 },
};

const BF: Readonly<Record<string, GazetteerPoint>> = {
  ouagadougou: { latitude: 12.3714, longitude: -1.5197 },
  "bobo-dioulasso": { latitude: 11.1771, longitude: -4.2979 },
  koudougou: { latitude: 12.2526, longitude: -2.3622 },
  ouahigouya: { latitude: 13.5828, longitude: -2.4216 },
  banfora: { latitude: 10.6376, longitude: -4.7526 },
  kaya: { latitude: 13.0917, longitude: -1.0839 },
  "fada-ngourma": { latitude: 12.0616, longitude: 0.3583 },
  tenkodogo: { latitude: 11.7801, longitude: -0.3697 },
};

const BY_MARKET: Readonly<
  Record<string, Readonly<Record<string, GazetteerPoint>>>
> = { FR, BE, CH, LU, SN, BF };

/**
 * Reduces a written place to a lookup key: accents folded, punctuation
 * collapsed, and the noise a form collects — a department in brackets, a
 * "Cedex" suffix — dropped.
 */
export function normalizePlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\bcedex\b.*$/i, " ")
    .replace(/^(st|ste)[\s-]+/, "saint-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The market a postcode belongs to cannot be inferred here — 1000 is Brussels
 * and also a Swiss canton's range — so the market is always supplied by the
 * caller, and a lookup never falls through to another country.
 */
export function resolveApproximatePlace(input: {
  city?: string | null;
  marketCode?: string | null;
}): ResolvedPlace | null {
  const table = BY_MARKET[(input.marketCode || "FR").toUpperCase()];
  if (!table || !input.city) return null;

  const normalized = normalizePlaceName(input.city);
  if (!normalized) return null;

  const exact = table[normalized];
  if (exact) return { ...exact, precision: "city" };

  /*
   * "Lyon 2e" and "Paris 11ᵉ arrondissement" are how the catalogue writes
   * arrondissements, and both should find their own entry before falling back
   * to the city. Only after that does the bare city name apply.
   */
  const arrondissement = normalized.match(
    /^([a-z-]+?)-(\d{1,2})(?:er|e|eme|ere)?(?:-arrondissement)?$/,
  );
  if (arrondissement) {
    const [, town, number] = arrondissement;
    const suffix = number === "1" ? "1er" : `${number}e`;
    const numbered = table[`${town}-${suffix}`];
    if (numbered) return { ...numbered, precision: "city" };
    const bare = table[town];
    if (bare) return { ...bare, precision: "city" };
  }

  return null;
}
