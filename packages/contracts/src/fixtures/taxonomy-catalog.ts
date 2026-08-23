export type CanonicalTaxonomyLevel = "category" | "subcategory" | "type" | "subtype";

export interface CanonicalTaxonomyIdentity {
  id: string;
  code: string;
  slug: string;
  labels: Record<"fr-FR" | "en-US", string>;
  shortLabels?: Partial<Record<"fr-FR" | "en-US", string>>;
  parentId?: string;
  iconName: string;
  sortOrder: number;
  level: CanonicalTaxonomyLevel;
  publishable: boolean;
  listingFamily: string;
  supportedIntents: string[];
}

export const CANONICAL_TAXONOMY_IDS = {
  vehicles: "vehicles",
  vehicleCars: "vehicles.cars",
  realEstate: "real_estate",
  realEstateSales: "real_estate.sales",
  realEstateRentals: "real_estate.rentals",
  jobs: "jobs",
  jobOffers: "jobs.offers",
  courses: "services.tutoring",
  electronics: "electronics",
} as const;

type TaxonomyIdentityTuple = readonly [
  id: string,
  code: string,
  slug: string,
  labelFr: string,
  labelEn: string,
  shortFr: string,
  shortEn: string,
  parentId: string | null,
  iconName: string,
  sortOrder: number,
  level: CanonicalTaxonomyLevel,
  publishable: boolean,
  listingFamily: string,
  supportedIntents: readonly string[],
];

const IDENTITIES: readonly TaxonomyIdentityTuple[] = [
  ["vehicles","VEH","vehicules","Véhicules","Vehicles","Véhicules","Vehicles",null,"Car",1,"category",false,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars","VEH_CARS","voitures","Voitures d'occasion","Used Cars","Voitures","Cars","vehicles","Tag",1,"subcategory",false,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars.citadines","VEH_CARS_CITADINE","citadines","Citadines","City cars","","","vehicles.cars","Tag",1,"type",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars.berlines","VEH_CARS_BERLINE","berlines","Berlines","Sedans","","","vehicles.cars","Tag",2,"type",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars.suv","VEH_CARS_SUV","suv-4x4","SUV & 4x4","SUVs & 4x4","","","vehicles.cars","Tag",3,"type",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars.breaks","VEH_CARS_BREAK","breaks","Breaks","Station wagons","","","vehicles.cars","Tag",4,"type",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars.coupes_cabriolets","VEH_CARS_COUPE","coupes-cabriolets","Coupés & Cabriolets","Coupes & Convertibles","","","vehicles.cars","Tag",5,"type",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cars.utilitaires","VEH_CARS_UTILITAIRE","utilitaires-fourgons","Utilitaires & Fourgons","Vans & Commercial","","","vehicles.cars","Tag",6,"type",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.motos","VEH_MOTOS","motos-scooters","Motos & Scooters","Motorcycles & Scooters","Motos & Scooters","Motorcycles","vehicles","Tag",2,"subcategory",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.cycles","VEH_CYCLES","velos-trottinettes","Vélos & Trottinettes électriques","Bicycles & E-scooters","Vélos & Trottinettes","Bikes & Scooters","vehicles","Tag",3,"subcategory",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["vehicles.parts","VEH_PARTS","equipement-pieces-auto-moto","Équipements & Pièces Auto / Moto","Auto & Moto Parts","Pièces auto & moto","Auto & Moto Parts","vehicles","Tag",4,"subcategory",true,"vehicle",["SELL","GIVE","EXCHANGE"]],
  ["real_estate","RE","immobilier","Immobilier","Real Estate","Immobilier","Real Estate",null,"Building",2,"category",false,"real_estate",["SELL","RENT"]],
  ["real_estate.sales","RE_SALES","ventes-immobilieres","Ventes immobilières","Properties for Sale","Ventes immo","For Sale","real_estate","Tag",1,"subcategory",true,"real_estate",["SELL","RENT"]],
  ["real_estate.rentals","RE_RENTALS","locations-immobilieres","Locations à l'année","Long-term Rentals","Locations","Rentals","real_estate","Tag",2,"subcategory",true,"real_estate",["RENT"]],
  ["real_estate.commercial","RE_COMMERCIAL","bureaux-commerces","Bureaux & Commerces","Commercial Properties","Bureaux & Commerces","Commercial","real_estate","Tag",3,"subcategory",true,"real_estate",["SELL","RENT"]],
  ["real_estate.parking","RE_PARKING","parkings-garages","Parkings & Garages","Parking & Garages","Parkings & Garages","Parking","real_estate","Tag",4,"subcategory",true,"real_estate",["SELL","RENT"]],
  ["jobs","JOB","emploi","Emploi & Recrutement","Jobs & Careers","Emploi","Jobs",null,"Briefcase",3,"category",false,"job",["JOB_OFFER"]],
  ["jobs.offers","JOB_OFFERS","offres-d-emploi","Offres d'emploi","Job Offers","Offres d'emploi","Job Offers","jobs","Tag",1,"subcategory",true,"job",["JOB_OFFER"]],
  ["services","SRV","services","Services & Prestations","Services","Services","Services",null,"Wrench",4,"category",false,"service",["OFFER_SERVICE"]],
  ["services.home_repairs","SRV_HOME","bricolage-travaux","Bricolage, Rénovation & Travaux","Home Improvement","Bricolage & Travaux","Home Repairs","services","Tag",1,"subcategory",true,"service",["OFFER_SERVICE"]],
  ["services.tutoring","SRV_TUTOR","cours-particuliers","Cours particuliers & Formation","Tutoring & Lessons","Cours & Formation","Tutoring","services","Tag",2,"subcategory",true,"service",["OFFER_SERVICE"]],
  ["services.events","SRV_EVENT","evenementiel-animation","Événementiel, Photo & DJ","Events & Entertainment","Événementiel & Photo","Events","services","Tag",3,"subcategory",true,"service",["OFFER_SERVICE"]],
  ["home_garden","HOME","maison-jardin","Maison, Meubles & Jardin","Home & Garden","Maison & Jardin","Home & Garden",null,"Home",5,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["home_garden.furniture","HOME_FURNITURE","mobilier","Mobilier & Meubles","Furniture","Mobilier","Furniture","home_garden","Tag",1,"subcategory",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["home_garden.furniture.sofas","HOME_SOFAS","canapes-fauteuils","Canapés & Fauteuils","Sofas & Armchairs","","","home_garden.furniture","Tag",1,"type",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["home_garden.furniture.tables","HOME_TABLES","tables-chaises","Tables & Chaises","Tables & Chairs","","","home_garden.furniture","Tag",2,"type",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["home_garden.furniture.beds","HOME_BEDS","lits-literie","Lits & Literie","Beds & Mattresses","","","home_garden.furniture","Tag",3,"type",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["home_garden.appliances","HOME_APPLIANCES","electromenager","Électroménager","Home Appliances","Électroménager","Appliances","home_garden","Tag",2,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["home_garden.diy_garden","HOME_DIY","bricolage-outillage-jardin","Bricolage, Outillage & Jardin","DIY & Gardening","Bricolage & Jardin","DIY & Garden","home_garden","Tag",3,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["electronics","ELEC","multimedia-electronique","Électronique & Multimédia","Electronics & Tech","Multimédia","Tech",null,"Smartphone",6,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["electronics.smartphones","ELEC_PHONES","smartphones-telephones","Smartphones & Téléphones","Smartphones","Téléphones","Phones","electronics","Tag",1,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["electronics.computers","ELEC_COMPUTERS","informatique-pc-portables","Informatique & PC Portables","Computers & Laptops","Informatique","Computers","electronics","Tag",2,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["electronics.gaming","ELEC_GAMING","consoles-jeux-video","Consoles & Jeux vidéo","Video Games & Consoles","Jeux vidéo","Gaming","electronics","Tag",3,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["electronics.audio_hifi","ELEC_AUDIO","audio-hi-fi-casques","Audio, Hi-Fi & Casques","Audio & Headphones","Audio & Hi-Fi","Audio","electronics","Tag",4,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["fashion","FASH","mode-accessoires","Mode & Accessoires","Fashion & Accessories","Mode","Fashion",null,"Shirt",7,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["fashion.women","FASH_WOMEN","vetements-femme","Vêtements Femme","Women's Clothing","Mode Femme","Women","fashion","Tag",1,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["fashion.men","FASH_MEN","vetements-homme","Vêtements Homme","Men's Clothing","Mode Homme","Men","fashion","Tag",2,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["fashion.shoes","FASH_SHOES","chaussures","Chaussures","Shoes","Chaussures","Shoes","fashion","Tag",3,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["fashion.jewelry","FASH_JEWELRY","montres-bijoux","Montres & Bijoux","Watches & Jewelry","Montres & Bijoux","Watches & Jewelry","fashion","Tag",4,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["baby_kids","BABY","bebe-puericulture-enfants","Bébé & Puériculture","Baby & Kids","Bébé & Enfant","Baby & Kids",null,"Baby",8,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["baby_kids.strollers","BABY_STROLLERS","poussettes-sieges-auto","Poussettes & Sièges auto","Strollers & Car Seats","Poussettes & Sièges","Strollers","baby_kids","Tag",1,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["baby_kids.toys","BABY_TOYS","jouets-jeux-eveil","Jouets & Jeux d'éveil","Toys & Games","Jouets & Éveil","Toys","baby_kids","Tag",2,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["leisure_culture","LEIS","loisirs-culture","Loisirs, Livres & Musique","Leisure & Culture","Loisirs & Culture","Leisure & Culture",null,"BookOpen",9,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["leisure_culture.instruments","LEIS_MUSIC","instruments-de-musique","Instruments de musique","Musical Instruments","Instruments","Instruments","leisure_culture","Tag",1,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["leisure_culture.books","LEIS_BOOKS","livres-bd-mangas","Livres, BD & Mangas","Books & Comics","Livres & BD","Books","leisure_culture","Tag",2,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["sports_outdoors","SPORT","sports-plein-air","Sports & Plein air","Sports & Outdoors","Sports","Sports",null,"Trophy",10,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["sports_outdoors.fitness","SPORT_FITNESS","fitness-musculation","Fitness & Musculation","Fitness & Gym","Fitness","Fitness","sports_outdoors","Tag",1,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["sports_outdoors.outdoor","SPORT_OUTDOOR","randonnee-camping-ski","Randonnée, Camping & Ski","Outdoor & Ski","Outdoor & Rando","Outdoor","sports_outdoors","Tag",2,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["sports_outdoors.water_sports","SPORT_WATER","sports-nautiques","Sports nautiques & Glisse","Water Sports & Boardsports","Sports nautiques","Water Sports","sports_outdoors","Tag",3,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["pets","PETS","animaux-accessoires","Animaux & Accessoires","Pets & Accessories","Animaux","Pets",null,"Dog",11,"category",false,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["pets.accessories","PETS_ACC","accessoires-animaux","Accessoires & Alimentation","Pet Supplies","Accessoires & Soins","Pet Supplies","pets","Tag",1,"subcategory",true,"physical_product",["SELL","GIVE","EXCHANGE"]],
  ["professional_btp","PRO_BTP","materiel-professionnel","Matériel Professionnel & BTP","Professional Equipment","Matériel Pro","Pro Equipment",null,"HardHat",12,"category",false,"professional_equipment",["SELL","RENT"]],
  ["professional_btp.machinery","PRO_MACHINERY","btp-chantier-engins","BTP, Chantier & Engins","Construction & Heavy Machinery","Engins & BTP","Construction","professional_btp","Tag",1,"subcategory",true,"professional_equipment",["SELL","RENT"]],
  ["professional_btp.catering","PRO_CATERING","restauration-hotellerie","Restauration & Hôtellerie (CHR)","Catering & Hospitality","Restauration CHR","Catering","professional_btp","Tag",2,"subcategory",true,"professional_equipment",["SELL","RENT"]],
  ["agriculture","AGRI","materiel-agricole-espaces-verts","Agriculture & Espaces verts","Agriculture & Farming","Agriculture","Agriculture",null,"Tractor",13,"category",false,"professional_equipment",["SELL","RENT"]],
  ["agriculture.tractors","AGRI_TRACTORS","tracteurs-materiel-recolte","Tracteurs & Matériel de récolte","Tractors & Harvesters","Tracteurs & Récolte","Tractors","agriculture","Tag",1,"subcategory",true,"professional_equipment",["SELL","RENT"]],
  ["energy_transition","ENERGY","energie-solaire-transition","Énergie & Transition Écologique","Solar Energy & EV","Énergie & Solaire","Clean Energy",null,"Sun",14,"category",false,"professional_equipment",["SELL","RENT"]],
  ["energy_transition.solar","ENERGY_SOLAR","panneaux-solaires-onduleurs","Panneaux solaires & Onduleurs","Solar Panels & Inverters","Panneaux solaires","Solar Panels","energy_transition","Tag",1,"subcategory",true,"professional_equipment",["SELL","RENT"]],
  ["energy_transition.ev_charging","ENERGY_EV","bornes-recharge-ve","Bornes de recharge VE","EV Charging Stations","Bornes de recharge","EV Chargers","energy_transition","Tag",2,"subcategory",true,"professional_equipment",["SELL","RENT"]],
  ["pro_it_telecom","PRO_IT","informatique-pro-serveurs","Informatique Pro & Serveurs","Enterprise IT & Servers","IT & Serveurs","Enterprise IT",null,"Server",15,"category",true,"professional_equipment",["SELL","RENT"]],
  ["deals_donations","DEALS","dons-solidarite-bons-plans","Dons & Solidarité","Free Items & Donations","Dons & Gratuit","Free Items",null,"Gift",16,"category",true,"physical_product",["GIVE","EXCHANGE"]],
] as const;

export const CANONICAL_TAXONOMY_IDENTITIES: readonly CanonicalTaxonomyIdentity[] =
  IDENTITIES.map(
    ([
      id,
      code,
      slug,
      labelFr,
      labelEn,
      shortFr,
      shortEn,
      parentId,
      iconName,
      sortOrder,
      level,
      publishable,
      listingFamily,
      supportedIntents,
    ]) => ({
      id,
      code,
      slug,
      labels: { "fr-FR": labelFr, "en-US": labelEn },
      shortLabels:
        shortFr || shortEn
          ? { "fr-FR": shortFr || labelFr, "en-US": shortEn || labelEn }
          : undefined,
      parentId: parentId || undefined,
      iconName,
      sortOrder,
      level,
      publishable,
      listingFamily,
      supportedIntents: [...supportedIntents],
    }),
  );

export const CANONICAL_TAXONOMY_IDENTITY_BY_ID = new Map(
  CANONICAL_TAXONOMY_IDENTITIES.map((node) => [node.id, node] as const),
);

/**
 * Historical category IDs/slugs that must keep resolving during migration.
 * Discovery collections such as `bons-plans` are deliberately absent: they
 * are not taxonomy identities.
 */
export const CANONICAL_TAXONOMY_ALIASES: Readonly<Record<string, string>> = {
  vehicules: "vehicles",
  voitures: "vehicles.cars",
  cars: "vehicles.cars",
  motos: "vehicles.motos",
  motorcycles: "vehicles.motos",
  bicycles: "vehicles.cycles",
  velos: "vehicles.cycles",
  immobilier: "real_estate",
  "real-estate": "real_estate",
  "ventes-immobilieres": "real_estate.sales",
  "real-estate-sale": "real_estate.sales",
  locations: "real_estate.rentals",
  "real-estate-rent": "real_estate.rentals",
  multimedia: "electronics",
  smartphones: "electronics.smartphones",
  computers: "electronics.computers",
  gaming: "electronics.gaming",
  "electronics.telephony.smartphones": "electronics.smartphones",
  informatique: "electronics.computers",
  "consoles-jeux": "electronics.gaming",
  "consoles-jeux-video": "electronics.gaming",
  "maison-deco": "home_garden",
  "home-garden": "home_garden",
  mobilier: "home_garden.furniture",
  furniture: "home_garden.furniture",
  electromenager: "home_garden.appliances",
  appliances: "home_garden.appliances",
  "home.furniture.sofas": "home_garden.furniture.sofas",
  "bricolage-jardin": "home_garden.diy_garden",
  mode: "fashion",
  "mode-beaute": "fashion",
  "mode-accessoires": "fashion",
  "vetements-femme": "fashion.women",
  "clothing-women": "fashion.women",
  "vetements-homme": "fashion.men",
  "clothing-men": "fashion.men",
  "luxury-watches": "fashion.jewelry",
  "loisirs-sport": "leisure_culture",
  "leisure-sports": "leisure_culture",
  "musical-instruments": "leisure_culture.instruments",
  "instruments-musique": "leisure_culture.instruments",
  "sport-equipment": "sports_outdoors.fitness",
  "sports-plein-air": "sports_outdoors",
  "materiel-pro": "professional_btp",
  professional: "professional_btp",
  "materiel-professionnel-btp": "professional_btp",
  emploi: "jobs",
  animaux: "pets",
  sports: "sports_outdoors",
  "sports-loisirs": "sports_outdoors",
  "sports-hobbies": "sports_outdoors",
  "sports-nautiques": "sports_outdoors.water_sports",
  "poussettes-siege-auto": "baby_kids.strollers",
  "outillage-btp": "professional_btp.machinery",
  "cours-formations": "services.tutoring",
  "offres-emploi": "jobs.offers",
};
