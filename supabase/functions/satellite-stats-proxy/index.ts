const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch CelesTrak GP data in JSON format for active satellites
    const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CelesTrak API returned ${response.status}`);
    }

    const satellites: any[] = await response.json();
    const total = satellites.length;

    // Classify by orbit type using mean motion
    const GM = 398600.4418;
    let leo = 0, meo = 0, geo = 0, heo = 0;
    const countryMap: Record<string, number> = {};
    const constellations: Record<string, number> = {};

    for (const sat of satellites) {
      const mm = sat.MEAN_MOTION;
      const ecc = sat.ECCENTRICITY;
      if (!mm || mm <= 0) continue;

      const nRadPerSec = (mm * 2 * Math.PI) / 86400;
      const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
      const perigee = a * (1 - ecc) - 6371;
      const apogee = a * (1 + ecc) - 6371;

      if (apogee - perigee > 20000) {
        heo++;
      } else if (perigee < 2000) {
        leo++;
      } else if (perigee >= 2000 && perigee < 35000) {
        meo++;
      } else {
        geo++;
      }

      // Country from OBJECT_ID (first part before dash)
      const objId = sat.OBJECT_ID || '';
      const year = objId.split('-')[0] || 'UNK';
      // Use COUNTRY_CODE or infer from name
      const name = sat.OBJECT_NAME || '';
      if (name.startsWith('STARLINK')) {
        constellations['Starlink'] = (constellations['Starlink'] || 0) + 1;
      } else if (name.startsWith('ONEWEB')) {
        constellations['OneWeb'] = (constellations['OneWeb'] || 0) + 1;
      } else if (name.includes('IRIDIUM')) {
        constellations['Iridium'] = (constellations['Iridium'] || 0) + 1;
      } else if (name.includes('COSMOS') || name.includes('KOSMOS')) {
        constellations['Cosmos'] = (constellations['Cosmos'] || 0) + 1;
      }
    }

    return new Response(JSON.stringify({
      totalActive: total,
      byOrbit: {
        leo,
        meo,
        geo,
        heo,
      },
      constellations,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Satellite stats proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
