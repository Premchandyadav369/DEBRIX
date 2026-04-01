const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE = 'https://api.keeptrack.space/v4';

async function fetchKT(path: string, apiKey: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-API-Key': apiKey } });
  if (!res.ok) throw new Error(`KeepTrack ${path} returned ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('KEEPTRACK_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'KEEPTRACK_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch metrics from KeepTrack in parallel
    const [activeCount, debrisCount, satsData] = await Promise.all([
      fetchKT('/metrics/active/count', apiKey),
      fetchKT('/metrics/debris/count', apiKey),
      fetchKT('/sats/brief', apiKey),
    ]);

    const totalActive = typeof activeCount === 'number' ? activeCount : activeCount?.count || 0;
    const totalDebris = typeof debrisCount === 'number' ? debrisCount : debrisCount?.count || 0;

    // Process brief satellite data for orbit classification and constellations
    const satellites = Array.isArray(satsData) ? satsData : [];
    const GM = 398600.4418;
    let leo = 0, meo = 0, geo = 0, heo = 0;
    const constellations: Record<string, number> = {};

    for (const sat of satellites) {
      const mm = sat.MEAN_MOTION || sat.meanMotion;
      const ecc = sat.ECCENTRICITY || sat.eccentricity || 0;
      const name = sat.OBJECT_NAME || sat.name || '';
      if (!mm || mm <= 0) continue;

      const nRadPerSec = (mm * 2 * Math.PI) / 86400;
      const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
      const perigee = a * (1 - ecc) - 6371;
      const apogee = a * (1 + ecc) - 6371;

      if (apogee - perigee > 20000) heo++;
      else if (perigee < 2000) leo++;
      else if (perigee < 35000) meo++;
      else geo++;

      if (name.startsWith('STARLINK')) constellations['Starlink'] = (constellations['Starlink'] || 0) + 1;
      else if (name.startsWith('ONEWEB')) constellations['OneWeb'] = (constellations['OneWeb'] || 0) + 1;
      else if (name.includes('IRIDIUM')) constellations['Iridium'] = (constellations['Iridium'] || 0) + 1;
      else if (name.includes('COSMOS') || name.includes('KOSMOS')) constellations['Cosmos'] = (constellations['Cosmos'] || 0) + 1;
      else if (name.includes('GLOBALSTAR')) constellations['Globalstar'] = (constellations['Globalstar'] || 0) + 1;
      else if (name.includes('ORBCOMM')) constellations['Orbcomm'] = (constellations['Orbcomm'] || 0) + 1;
      else if (name.includes('PLANET') || name.startsWith('FLOCK')) constellations['Planet Labs'] = (constellations['Planet Labs'] || 0) + 1;
      else if (name.includes('SPIRE')) constellations['Spire'] = (constellations['Spire'] || 0) + 1;
    }

    return new Response(JSON.stringify({
      totalActive: totalActive || satellites.length,
      totalDebris,
      byOrbit: { leo, meo, geo, heo },
      constellations,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Satellite stats proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
