/** Oblast capital (city centre) as [lat, lon], keyed by the exact string `REGIONS` (`@carplates/shared`) produces. */
export const REGION_CENTERS: Readonly<Record<string, readonly [number, number]>> = {
  Київ: [50.4501, 30.5234],
  'Київська область': [50.4501, 30.5234],
  'Вінницька область': [49.2328, 28.4681],
  'Волинська область': [50.7472, 25.3254],
  'Дніпропетровська область': [48.4647, 35.0462],
  'АР Крим': [44.9521, 34.1024],
  'Донецька область': [48.0159, 37.8028],
  'Житомирська область': [50.2547, 28.6587],
  'Закарпатська область': [48.6208, 22.2879],
  'Запорізька область': [47.8388, 35.1396],
  'Івано-Франківська область': [48.9226, 24.7111],
  'Кіровоградська область': [48.5079, 32.2623],
  'Луганська область': [48.574, 39.3078],
  'Львівська область': [49.8397, 24.0297],
  'Миколаївська область': [46.975, 31.9946],
  'Одеська область': [46.4825, 30.7233],
  'Полтавська область': [49.5883, 34.5514],
  'Рівненська область': [50.6199, 26.2516],
  Севастополь: [44.6166, 33.5254],
  'Сумська область': [50.9077, 34.7981],
  'Тернопільська область': [49.5535, 25.5948],
  'Харківська область': [49.9935, 36.2304],
  'Херсонська область': [46.6354, 32.6169],
  'Хмельницька область': [49.4229, 26.9871],
  'Черкаська область': [49.4444, 32.0598],
  'Чернігівська область': [51.4982, 31.2893],
  'Чернівецька область': [48.2921, 25.9358]
}

const LON_SPAN = 0.09
const LAT_SPAN = 0.045

/** OpenStreetMap embed URL (no key, no GPS) centred on the region's capital, or undefined if unknown. */
export function regionMapUrl(region: string): string | undefined {
  const center = REGION_CENTERS[region]
  if (!center) return undefined
  const [lat, lon] = center
  const bbox = [lon - LON_SPAN, lat - LAT_SPAN, lon + LON_SPAN, lat + LAT_SPAN].map(n => n.toFixed(4)).join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
}
