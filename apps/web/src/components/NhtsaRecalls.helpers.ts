/** NHTSA's top-level component labels (as seen in recalls and complaints) → i18n slug (`nhtsa.comp.<slug>`). */
const COMPONENT_SLUGS: Readonly<Record<string, string>> = {
  'AIR BAGS': 'airBags',
  'BACK OVER PREVENTION': 'backOver',
  'CHILD SEAT': 'childSeat',
  COMMUNICATION: 'communication',
  'ELECTRICAL SYSTEM': 'electrical',
  'ELECTRONIC STABILITY CONTROL (ESC)': 'esc',
  ENGINE: 'engine',
  'ENGINE AND ENGINE COOLING': 'engineCooling',
  EQUIPMENT: 'equipment',
  'EQUIPMENT ADAPTIVE/MOBILITY': 'adaptive',
  'EXTERIOR LIGHTING': 'exteriorLights',
  FIRERELATED: 'fire',
  'FORWARD COLLISION AVOIDANCE': 'collision',
  'FUEL SYSTEM': 'fuel',
  'FUEL SYSTEM, DIESEL': 'fuelDiesel',
  'FUEL SYSTEM, GASOLINE': 'fuelGasoline',
  'FUEL SYSTEM, OTHER': 'fuelOther',
  'FUEL/PROPULSION SYSTEM': 'fuelPropulsion',
  'HYBRID PROPULSION SYSTEM': 'hybrid',
  'INTERIOR LIGHTING': 'interiorLights',
  'LANE DEPARTURE': 'laneDeparture',
  'LATCHES/LOCKS/LINKAGES': 'latches',
  OTHER: 'other',
  'PARKING BRAKE': 'parkingBrake',
  'POWER TRAIN': 'powerTrain',
  ROLLOVER: 'rollover',
  'SEAT BELTS': 'seatBelts',
  SEATS: 'seats',
  'SERVICE BRAKES': 'brakes',
  'SERVICE BRAKES, AIR': 'brakesAir',
  'SERVICE BRAKES, ELECTRIC': 'brakesElectric',
  'SERVICE BRAKES, HYDRAULIC': 'brakesHydraulic',
  STEERING: 'steering',
  STRUCTURE: 'structure',
  SUSPENSION: 'suspension',
  TIRES: 'tires',
  'TRACTION CONTROL SYSTEM': 'traction',
  'TRAILER HITCHES': 'trailerHitch',
  'UNKNOWN OR OTHER': 'other',
  'VEHICLE SPEED CONTROL': 'speedControl',
  VISIBILITY: 'visibility',
  'VISIBILITY/WIPER': 'wipers',
  WHEELS: 'wheels'
}

/** The part of an NHTSA component label before the first ":" ("AIR BAGS:FRONTAL:DRIVER SIDE" → "AIR BAGS"). */
export const componentHead = (component: string): string => (component.split(':')[0] ?? '').trim()

/** i18n key for a known NHTSA top-level component; null for wording we have no translation for (the UI then shows the original). */
export const componentKey = (component: string): string | null => {
  const slug = COMPONENT_SLUGS[componentHead(component).toUpperCase()]
  return slug ? `nhtsa.comp.${slug}` : null
}

/** True when the label has sub-parts after the head (these stay in NHTSA's English). */
export const hasComponentDetail = (component: string): boolean => component.includes(':')
