import type { Bounds } from "@/utils";

export type City = {
  name: string;
  slug: string;
  bounds: Bounds;
};

// The 50 most populous communes of mainland France (INSEE populations and
// bounding boxes from geo.api.gouv.fr).
export const CITIES: City[] = [
  { name: "Paris", slug: "paris", bounds: { south: 48.815562, north: 48.902148, west: 2.224219, east: 2.469851 } },
  { name: "Marseille", slug: "marseille", bounds: { south: 43.169636, north: 43.391057, west: 5.228751, east: 5.532543 } },
  { name: "Lyon", slug: "lyon", bounds: { south: 45.707481, north: 45.80842, west: 4.771865, east: 4.898396 } },
  { name: "Toulouse", slug: "toulouse", bounds: { south: 43.532693, north: 43.668714, west: 1.350329, east: 1.515356 } },
  { name: "Nice", slug: "nice", bounds: { south: 43.645406, north: 43.76091, west: 7.182148, east: 7.323476 } },
  { name: "Nantes", slug: "nantes", bounds: { south: 47.180628, north: 47.295839, west: -1.641774, east: -1.478895 } },
  { name: "Montpellier", slug: "montpellier", bounds: { south: 43.566722, north: 43.653295, west: 3.807052, east: 3.941287 } },
  { name: "Strasbourg", slug: "strasbourg", bounds: { south: 48.491948, north: 48.646201, west: 7.68812, east: 7.836038 } },
  { name: "Bordeaux", slug: "bordeaux", bounds: { south: 44.810741, north: 44.916694, west: -0.638699, east: -0.533325 } },
  { name: "Lille", slug: "lille", bounds: { south: 50.6009, north: 50.661262, west: 2.967992, east: 3.125688 } },
  { name: "Rennes", slug: "rennes", bounds: { south: 48.07688, north: 48.154989, west: -1.752528, east: -1.624359 } },
  { name: "Toulon", slug: "toulon", bounds: { south: 43.101049, north: 43.171676, west: 5.879488, east: 5.98739 } },
  { name: "Reims", slug: "reims", bounds: { south: 49.203917, north: 49.303164, west: 3.986061, east: 4.124155 } },
  { name: "Saint-Étienne", slug: "saint-etienne", bounds: { south: 45.371477, north: 45.47673, west: 4.244056, east: 4.488878 } },
  { name: "Le Havre", slug: "le-havre", bounds: { south: 49.451573, north: 49.540031, west: 0.066751, east: 0.19558 } },
  { name: "Villeurbanne", slug: "villeurbanne", bounds: { south: 45.748442, north: 45.795315, west: 4.858431, east: 4.921232 } },
  { name: "Dijon", slug: "dijon", bounds: { south: 47.286288, north: 47.377451, west: 4.962441, east: 5.101997 } },
  { name: "Angers", slug: "angers", bounds: { south: 47.4374, north: 47.526392, west: -0.617726, east: -0.508143 } },
  { name: "Grenoble", slug: "grenoble", bounds: { south: 45.154148, north: 45.214319, west: 5.678003, east: 5.753078 } },
  { name: "Nîmes", slug: "nimes", bounds: { south: 43.741435, north: 43.922876, west: 4.235795, east: 4.449922 } },
  { name: "Aix-en-Provence", slug: "aix-en-provence", bounds: { south: 43.446031, north: 43.62598, west: 5.269537, east: 5.506288 } },
  { name: "Saint-Denis", slug: "saint-denis", bounds: { south: 48.901485, north: 48.974028, west: 2.333246, east: 2.398159 } },
  { name: "Clermont-Ferrand", slug: "clermont-ferrand", bounds: { south: 45.755728, north: 45.818372, west: 3.053291, east: 3.172151 } },
  { name: "Le Mans", slug: "le-mans", bounds: { south: 47.927941, north: 48.035868, west: 0.136294, east: 0.255108 } },
  { name: "Brest", slug: "brest", bounds: { south: 48.357314, north: 48.459596, west: -4.568924, east: -4.430326 } },
  { name: "Tours", slug: "tours", bounds: { south: 47.348943, north: 47.439595, west: 0.652788, east: 0.737097 } },
  { name: "Amiens", slug: "amiens", bounds: { south: 49.846843, north: 49.950577, west: 2.223566, east: 2.345797 } },
  { name: "Annecy", slug: "annecy", bounds: { south: 45.827994, north: 45.976715, west: 6.048414, east: 6.204393 } },
  { name: "Limoges", slug: "limoges", bounds: { south: 45.788668, north: 45.928376, west: 1.146237, east: 1.317536 } },
  { name: "Metz", slug: "metz", bounds: { south: 49.060822, north: 49.148828, west: 6.136002, east: 6.256465 } },
  { name: "Perpignan", slug: "perpignan", bounds: { south: 42.64925, north: 42.748839, west: 2.826292, east: 2.982731 } },
  { name: "Boulogne-Billancourt", slug: "boulogne-billancourt", bounds: { south: 48.821476, north: 48.853517, west: 2.222935, east: 2.262792 } },
  { name: "Besançon", slug: "besancon", bounds: { south: 47.200677, north: 47.319732, west: 5.940879, east: 6.083641 } },
  { name: "Rouen", slug: "rouen", bounds: { south: 49.417225, north: 49.465247, west: 1.030248, east: 1.152121 } },
  { name: "Orléans", slug: "orleans", bounds: { south: 47.813298, north: 47.933537, west: 1.875747, east: 1.948682 } },
  { name: "Montreuil", slug: "montreuil", bounds: { south: 48.848745, north: 48.878751, west: 2.415286, east: 2.482824 } },
  { name: "Caen", slug: "caen", bounds: { south: 49.153021, north: 49.216261, west: -0.413763, east: -0.330723 } },
  { name: "Argenteuil", slug: "argenteuil", bounds: { south: 48.927733, north: 48.972421, west: 2.203319, east: 2.292215 } },
  { name: "Mulhouse", slug: "mulhouse", bounds: { south: 47.721883, north: 47.783362, west: 7.282478, east: 7.368592 } },
  { name: "Nancy", slug: "nancy", bounds: { south: 48.666842, north: 48.709273, west: 6.134237, east: 6.212627 } },
  { name: "Tourcoing", slug: "tourcoing", bounds: { south: 50.693063, north: 50.749014, west: 3.118655, east: 3.196757 } },
  { name: "Roubaix", slug: "roubaix", bounds: { south: 50.668751, north: 50.708689, west: 3.151135, east: 3.217367 } },
  { name: "Nanterre", slug: "nanterre", bounds: { south: 48.874229, north: 48.920613, west: 2.169349, east: 2.234268 } },
  { name: "Vitry-sur-Seine", slug: "vitry-sur-seine", bounds: { south: 48.770008, north: 48.808518, west: 2.36737, east: 2.422828 } },
  { name: "Asnières-sur-Seine", slug: "asnieres-sur-seine", bounds: { south: 48.902286, north: 48.933838, west: 2.264984, east: 2.322015 } },
  { name: "Créteil", slug: "creteil", bounds: { south: 48.761731, north: 48.80735, west: 2.427288, east: 2.477368 } },
  { name: "Avignon", slug: "avignon", bounds: { south: 43.886472, north: 43.99664, west: 4.739284, east: 4.927231 } },
  { name: "Colombes", slug: "colombes", bounds: { south: 48.906027, north: 48.937623, west: 2.220398, east: 2.27332 } },
  { name: "Poitiers", slug: "poitiers", bounds: { south: 46.542226, north: 46.627016, west: 0.291081, east: 0.451843 } },
  { name: "Aubervilliers", slug: "aubervilliers", bounds: { south: 48.901161, north: 48.924466, west: 2.36562, east: 2.411502 } },];

export const findCityBySlug = (slug: string): City | null =>
  CITIES.find((c) => c.slug === slug) ?? null;

// "à Paris", but "au Havre" / "au Mans".
export const cityLocative = (name: string): string =>
  name.startsWith("Le ") ? `au ${name.slice(3)}` : `à ${name}`;
