const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Planet IDs in JPL Horizons system
const PLANETS = [
  { id: '199', name: 'Mercury', symbol: '☿' },
  { id: '299', name: 'Venus', symbol: '♀' },
  { id: '499', name: 'Mars', symbol: '♂' },
  { id: '599', name: 'Jupiter', symbol: '♃' },
  { id: '699', name: 'Saturn', symbol: '♄' },
  { id: '799', name: 'Uranus', symbol: '♅' },
  { id: '899', name: 'Neptune', symbol: '♆' },
];

interface PlanetData {
  name: string;
  symbol: string;
  ra: string;
  dec: string;
  azimuth: number;
  elevation: number;
  magnitude: number;
  constellation: string;
  riseTime: string | null;
  setTime: string | null;
  transitTime: string | null;
  angularDiameter: number;
  sunElongation: number;
  illumination: number;
}

async function fetchPlanetEphemeris(
  planetId: string,
  lat: number,
  lon: number,
  elevation: number,
  startTime: string,
  stopTime: string
): Promise<string> {
  // Use Horizons API to get observer ephemeris
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${planetId}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: 'coord@399',
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${lon},${lat},${elevation / 1000}'`,
    START_TIME: `'${startTime}'`,
    STOP_TIME: `'${stopTime}'`,
    STEP_SIZE: '\'1 h\'',
    QUANTITIES: '\'1,4,9,13,17,20,23,29,42\'',
    CSV_FORMAT: 'YES',
    CAL_FORMAT: 'CAL',
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons API error: ${res.status}`);
  return res.text();
}

function parseHorizonsOutput(text: string): any[] {
  const lines = text.split('\n');
  let inData = false;
  const results: any[] = [];

  for (const line of lines) {
    if (line.trim() === '$$SOE') { inData = true; continue; }
    if (line.trim() === '$$EOE') { inData = false; continue; }
    if (inData && line.trim()) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 10) {
        results.push({
          datetime: parts[0],
          ra: parts[1],
          dec: parts[2],
          azimuth: parseFloat(parts[3]) || 0,
          elevation: parseFloat(parts[4]) || 0,
          visualMag: parseFloat(parts[5]) || 99,
          surfBrightness: parts[6],
          illumination: parseFloat(parts[7]) || 0,
          angularDiam: parseFloat(parts[8]) || 0,
          constellation: parts[9] || '',
          sunElongation: parseFloat(parts[10]) || 0,
          riseTransitSet: parts.slice(11).join(','),
        });
      }
    }
  }
  return results;
}

// Determine constellation from RA/Dec (simplified)
const CONSTELLATIONS_BY_RA: { name: string; raStart: number; raEnd: number }[] = [
  { name: 'Pisces', raStart: 0, raEnd: 2 },
  { name: 'Aries', raStart: 2, raEnd: 3.5 },
  { name: 'Taurus', raStart: 3.5, raEnd: 6 },
  { name: 'Gemini', raStart: 6, raEnd: 8 },
  { name: 'Cancer', raStart: 8, raEnd: 9.5 },
  { name: 'Leo', raStart: 9.5, raEnd: 12 },
  { name: 'Virgo', raStart: 12, raEnd: 14.5 },
  { name: 'Libra', raStart: 14.5, raEnd: 16 },
  { name: 'Scorpius', raStart: 16, raEnd: 17.5 },
  { name: 'Sagittarius', raStart: 17.5, raEnd: 20 },
  { name: 'Capricornus', raStart: 20, raEnd: 21.5 },
  { name: 'Aquarius', raStart: 21.5, raEnd: 24 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lat = body.lat || 28.6139; // Default: New Delhi
    const lon = body.lon || 77.209;
    const elevation = body.elevation || 0;

    const now = new Date();
    const startTime = now.toISOString().split('.')[0].replace('T', ' ');
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const stopTime = end.toISOString().split('.')[0].replace('T', ' ');

    const results: PlanetData[] = [];

    // Fetch all planets in parallel
    const fetches = PLANETS.map(async (planet) => {
      try {
        const text = await fetchPlanetEphemeris(planet.id, lat, lon, elevation, startTime, stopTime);
        const dataPoints = parseHorizonsOutput(text);

        if (dataPoints.length > 0) {
          // Get the current (first) data point
          const current = dataPoints[0];

          // Find rise/set from the 24h data
          let riseTime: string | null = null;
          let setTime: string | null = null;
          let transitTime: string | null = null;
          let maxElevation = current.elevation;

          for (let i = 1; i < dataPoints.length; i++) {
            const prev = dataPoints[i - 1];
            const curr = dataPoints[i];

            if (prev.elevation < 0 && curr.elevation >= 0 && !riseTime) {
              riseTime = curr.datetime?.split(' ').slice(-1)[0]?.substring(0, 5) || null;
            }
            if (prev.elevation >= 0 && curr.elevation < 0 && !setTime) {
              setTime = prev.datetime?.split(' ').slice(-1)[0]?.substring(0, 5) || null;
            }
            if (curr.elevation > maxElevation) {
              maxElevation = curr.elevation;
              transitTime = curr.datetime?.split(' ').slice(-1)[0]?.substring(0, 5) || null;
            }
          }

          const constellation = current.constellation?.trim() ||
            CONSTELLATIONS_BY_RA.find(c => {
              const raHours = parseFloat(current.ra) / 15;
              return raHours >= c.raStart && raHours < c.raEnd;
            })?.name || 'Unknown';

          return {
            name: planet.name,
            symbol: planet.symbol,
            ra: current.ra,
            dec: current.dec,
            azimuth: current.azimuth,
            elevation: current.elevation,
            magnitude: current.visualMag,
            constellation,
            riseTime,
            setTime,
            transitTime,
            angularDiameter: current.angularDiam,
            sunElongation: current.sunElongation,
            illumination: current.illumination,
          };
        }
        return null;
      } catch (err) {
        console.error(`Error fetching ${planet.name}:`, err);
        return null;
      }
    });

    const planetResults = await Promise.all(fetches);
    const validResults = planetResults.filter(Boolean) as PlanetData[];

    return new Response(JSON.stringify({
      planets: validResults,
      location: { lat, lon },
      timestamp: now.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Planets ephemeris error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
