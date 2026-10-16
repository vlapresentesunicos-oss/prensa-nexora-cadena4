export interface LocationReference {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export const ITUZAINGO_LOCATIONS: LocationReference[] = [
  {
    name: "Plaza San Martín (Centro de Ituzaingó)",
    lat: -27.5973,
    lng: -56.6874,
    description: "Plaza principal San Martín, zona céntrica de Ituzaingó, Corrientes"
  },
  {
    name: "Municipalidad y Centro Cívico de Ituzaingó",
    lat: -27.5958,
    lng: -56.6865,
    description: "Edificio municipal y centro administrativo de Ituzaingó"
  },
  {
    name: "Hospital Dr. Ricardo Billinghurst",
    lat: -27.6012,
    lng: -56.6840,
    description: "Hospital céntrico Dr. Ricardo Billinghurst de Ituzaingó"
  },
  {
    name: "Zona Comercial Av. 9 de Julio",
    lat: -27.5985,
    lng: -56.6888,
    description: "Avenida 9 de Julio, principal eje comercial céntrico"
  },
  {
    name: "Puerto de Ituzaingó",
    lat: -27.5815,
    lng: -56.6890,
    description: "Zona portuaria a orillas del Río Paraná, Ituzaingó, Corrientes"
  },
  {
    name: "Playa Paranaguá / Costanera Norte",
    lat: -27.5855,
    lng: -56.7025,
    description: "Zona costera y de balnearios de la playa Paranaguá, Ituzaingó"
  },
  {
    name: "Playa Bahía Biología",
    lat: -27.5830,
    lng: -56.6950,
    description: "Balneario Bahía Biología sobre el río Paraná"
  },
  {
    name: "Barrio General San Martín (Mil Viviendas)",
    lat: -27.6095,
    lng: -56.6960,
    description: "Barrio Mil Viviendas, zona residencial de Ituzaingó"
  },
  {
    name: "Barrio General Paz",
    lat: -27.6020,
    lng: -56.6780,
    description: "Barrio General Paz, zona urbana este de Ituzaingó"
  },
  {
    name: "Barrio San Jorge",
    lat: -27.6075,
    lng: -56.6835,
    description: "Barrio San Jorge, Ituzaingó"
  },
  {
    name: "Barrio Belgrano",
    lat: -27.5930,
    lng: -56.6810,
    description: "Barrio Belgrano, zona residencial norte-centro"
  },
  {
    name: "Barrio Itatí",
    lat: -27.6050,
    lng: -56.6910,
    description: "Barrio Nuestra Señora de Itatí, Ituzaingó"
  },
  {
    name: "Barrio Paraná",
    lat: -27.5900,
    lng: -56.6980,
    description: "Barrio Paraná, cerca de la ribera"
  },
  {
    name: "Barrio San Miguel",
    lat: -27.6140,
    lng: -56.6880,
    description: "Barrio San Miguel, zona sur de la ciudad"
  },
  {
    name: "Terminal de Ómnibus de Ituzaingó",
    lat: -27.6041,
    lng: -56.6803,
    description: "Terminal de colectivos de Ituzaingó, acceso por Av. Centenario"
  },
  {
    name: "Cruce de Ruta Nacional 12 y Av. Centenario",
    lat: -27.6166,
    lng: -56.6711,
    description: "Cruce estratégico de la Ruta Nacional 12 y Av. Centenario"
  },
  {
    name: "Acceso Principal por Ruta Nacional 12",
    lat: -27.6250,
    lng: -56.6830,
    description: "Ingreso principal terrestre a Ituzaingó desde Ruta 12"
  },
  {
    name: "Represa Hidroeléctrica Yacyretá",
    lat: -27.4795,
    lng: -56.7352,
    description: "Complejo de la Represa Hidroeléctrica Yacyretá"
  }
];

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

/**
 * Parses a coordinate string in the format "lat,lng" or similar.
 */
export function parseCoordinates(coordStr: string): { lat: number; lng: number } {
  if (!coordStr) return { lat: 0, lng: 0 };
  const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
  return {
    lat: parts[0] || 0,
    lng: parts[1] || 0
  };
}

/**
 * Finds the closest location reference and returns a high-precision descriptive name.
 */
export function getClosestLocation(lat: number, lng: number): LocationReference | null {
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
  let closest: LocationReference | null = null;
  let minDistance = Infinity;

  for (const loc of ITUZAINGO_LOCATIONS) {
    const dist = calculateDistanceInMeters(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  if (!closest) return null;

  let resolvedName = closest.name;
  let resolvedDesc = closest.description;

  if (minDistance < 300) {
    resolvedName = `${closest.name}`;
    resolvedDesc = `${closest.description} (en el lugar exacto)`;
  } else if (minDistance <= 1000) {
    resolvedName = `Cerca de ${closest.name} (a ${Math.round(minDistance)}m)`;
    resolvedDesc = `Aproximadamente a ${Math.round(minDistance)} metros de ${closest.description}`;
  } else {
    // If further than 1km from any landmark, use precise urban zone formatting to avoid misleading distant landmarks
    resolvedName = `Zona Urbana Ituzaingó (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    resolvedDesc = `Cobertura en zona urbana de Ituzaingó, Corrientes (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
  }

  return {
    name: resolvedName,
    lat: closest.lat,
    lng: closest.lng,
    description: resolvedDesc
  };
}
