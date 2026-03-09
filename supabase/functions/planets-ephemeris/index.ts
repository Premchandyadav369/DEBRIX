const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLANETS = [
  { id: '199', name: 'Mercury', symbol: '☿' },
  { id: '299', name: 'Venus', symbol: '♀' },
  { id: '499', name: 'Mars', symbol: '♂' },
  { id: '599', name: 'Jupiter', symbol: '♃' },
  { id: '699', name: 'Saturn', symbol: '♄' },
  { id: '799', name: 'Uranus', symbol: '♅' },
  { id: '899', name: 'Neptune', symbol: '♆' },
];

async function fetchPlanet(planetId: string, lat: number, lon: number): Promise<string> {
  const now = new Date();
  const start = now.toISOString().split('.')[0].replace('T', ' ');
  const end24h = new Date(now.getTime() + 24 * 3600000);
  const stop = end24h.toISOString().split('.')[0].replace('T', ' ');

  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${planetId}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: 'coord@399',
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${lon},${lat},0'`,
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: '\'1 h\'',
    QUANTITIES: '\'4,9,13,23,29\'',
    ANG_FORMAT: 'DEG',
    SUPPRESS_RANGE_RATE: 'YES',
    SKIP_DAYLT: 'NO',
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons returned ${res.status}`);
  return res.text();
}

interface ParsedPoint {
  datetime: string;
  azimuth: number;
  elevation: number;
  magnitude: number;
  surfBrt: number;
  angDiam: number;
  elongation: number;
  constellation: string;
}

function parseOutput(text: string): ParsedPoint[] {
  const lines = text.split('\n');
  let inData = false;
  const results: ParsedPoint[] = [];

  for (const line of lines) {
    if (line.trim() === '$$SOE') { inData = true; continue; }
    if (line.trim() === '$$EOE') { inData = false; continue; }
    if (!inData || !line.trim()) continue;

    // Fixed-width format parsing
    // The Horizons text output has columns separated by spaces
    // Format: Date__(UT)__HR:MN  Azi_(a-app)  Elev_(a-app)  APmag  S-brt  Ang-diam  S-O-T /r  Cnst
    const parts = line.trim().split(/\s+/);
    if (parts.length < 8) continue;

    // Find the date part (YYYY-Mon-DD HH:MM)
    // Example: "2026-Mar-09 03:48  123.456  45.678  -2.1  5.2  35.123  45.6 /L  Tau"
    let dateStr = '';
    let dataStart = 0;

    // Date is first 2 tokens: "2026-Mar-09" "03:48"
    if (parts[0].match(/^\d{4}-/)) {
      dateStr = parts[0] + ' ' + parts[1];
      dataStart = 2;
    } else {
      continue;
    }

    const nums = parts.slice(dataStart);
    // nums should be: azimuth, elevation, APmag, S-brt, ang-diam, elongation, /r, constellation
    
    const azimuth = parseFloat(nums[0]) || 0;
    const elevation = parseFloat(nums[1]) || 0;
    
    // Magnitude might be 'n.a.' for unobservable
    let magnitude = 99;
    if (nums[2] && nums[2] !== 'n.a.') magnitude = parseFloat(nums[2]) || 99;
    
    let surfBrt = 0;
    if (nums[3] && nums[3] !== 'n.a.') surfBrt = parseFloat(nums[3]) || 0;
    
    const angDiam = parseFloat(nums[4]) || 0;
    
    let elongation = 0;
    if (nums[5]) elongation = parseFloat(nums[5]) || 0;

    // Constellation is typically the last token
    let constellation = '';
    const lastToken = nums[nums.length - 1];
    if (lastToken && lastToken.match(/^[A-Z][a-z]{2}$/)) {
      constellation = lastToken;
    } else if (nums.length > 7 && nums[nums.length - 1]?.match(/^[A-Z]/)) {
      constellation = nums[nums.length - 1];
    }

    results.push({
      datetime: dateStr,
      azimuth,
      elevation,
      magnitude,
      surfBrt,
      angDiam,
      elongation,
      constellation,
    });
  }
  return results;
}

// Map Horizons 3-letter constellation codes to full names
const CONST_MAP: Record<string, string> = {
  'And': 'Andromeda', 'Ant': 'Antlia', 'Aps': 'Apus', 'Aqr': 'Aquarius', 'Aql': 'Aquila',
  'Ara': 'Ara', 'Ari': 'Aries', 'Aur': 'Auriga', 'Boo': 'Boötes', 'Cae': 'Caelum',
  'Cam': 'Camelopardalis', 'Cnc': 'Cancer', 'CVn': 'Canes Venatici', 'CMa': 'Canis Major',
  'CMi': 'Canis Minor', 'Cap': 'Capricornus', 'Car': 'Carina', 'Cas': 'Cassiopeia',
  'Cen': 'Centaurus', 'Cep': 'Cepheus', 'Cet': 'Cetus', 'Cha': 'Chamaeleon',
  'Cir': 'Circinus', 'Col': 'Columba', 'Com': 'Coma Berenices', 'CrA': 'Corona Australis',
  'CrB': 'Corona Borealis', 'Crv': 'Corvus', 'Crt': 'Crater', 'Cru': 'Crux',
  'Cyg': 'Cygnus', 'Del': 'Delphinus', 'Dor': 'Dorado', 'Dra': 'Draco',
  'Equ': 'Equuleus', 'Eri': 'Eridanus', 'For': 'Fornax', 'Gem': 'Gemini',
  'Gru': 'Grus', 'Her': 'Hercules', 'Hor': 'Horologium', 'Hya': 'Hydra',
  'Hyi': 'Hydrus', 'Ind': 'Indus', 'Lac': 'Lacerta', 'Leo': 'Leo',
  'LMi': 'Leo Minor', 'Lep': 'Lepus', 'Lib': 'Libra', 'Lup': 'Lupus',
  'Lyn': 'Lynx', 'Lyr': 'Lyra', 'Men': 'Mensa', 'Mic': 'Microscopium',
  'Mon': 'Monoceros', 'Mus': 'Musca', 'Nor': 'Norma', 'Oct': 'Octans',
  'Oph': 'Ophiuchus', 'Ori': 'Orion', 'Pav': 'Pavo', 'Peg': 'Pegasus',
  'Per': 'Perseus', 'Phe': 'Phoenix', 'Pic': 'Pictor', 'Psc': 'Pisces',
  'PsA': 'Piscis Austrinus', 'Pup': 'Puppis', 'Pyx': 'Pyxis', 'Ret': 'Reticulum',
  'Sge': 'Sagitta', 'Sgr': 'Sagittarius', 'Sco': 'Scorpius', 'Scl': 'Sculptor',
  'Sct': 'Scutum', 'Ser': 'Serpens', 'Sex': 'Sextans', 'Tau': 'Taurus',
  'Tel': 'Telescopium', 'Tri': 'Triangulum', 'TrA': 'Triangulum Australe',
  'Tuc': 'Tucana', 'UMa': 'Ursa Major', 'UMi': 'Ursa Minor', 'Vel': 'Vela',
  'Vir': 'Virgo', 'Vol': 'Volans', 'Vul': 'Vulpecula',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lat = body.lat ?? 28.6139;
    const lon = body.lon ?? 77.209;

    const planetResults = await Promise.all(
      PLANETS.map(async (planet) => {
        try {
          const text = await fetchPlanet(planet.id, lat, lon);
          const points = parseOutput(text);
          
          if (points.length === 0) {
            // Return raw text for debugging
            console.log(`No data parsed for ${planet.name}. Raw text snippet:`, text.substring(0, 500));
            return null;
          }

          const current = points[0];

          // Find rise/set times from 24h data
          let riseTime: string | null = null;
          let setTime: string | null = null;
          let transitTime: string | null = null;
          let maxEl = -90;

          for (let i = 1; i < points.length; i++) {
            if (points[i - 1].elevation < 0 && points[i].elevation >= 0 && !riseTime) {
              riseTime = points[i].datetime.split(' ')[1] || null;
            }
            if (points[i - 1].elevation >= 0 && points[i].elevation < 0 && !setTime) {
              setTime = points[i - 1].datetime.split(' ')[1] || null;
            }
            if (points[i].elevation > maxEl) {
              maxEl = points[i].elevation;
              transitTime = points[i].datetime.split(' ')[1] || null;
            }
          }

          const constName = CONST_MAP[current.constellation] || current.constellation || 'Unknown';

          return {
            name: planet.name,
            symbol: planet.symbol,
            azimuth: current.azimuth,
            elevation: current.elevation,
            magnitude: current.magnitude,
            constellation: constName,
            riseTime,
            setTime,
            transitTime,
            angularDiameter: current.angDiam,
            sunElongation: current.elongation,
            illumination: 0, // not requested to simplify
          };
        } catch (err) {
          console.error(`Error for ${planet.name}:`, err);
          return null;
        }
      })
    );

    return new Response(JSON.stringify({
      planets: planetResults.filter(Boolean),
      location: { lat, lon },
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Planets error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
