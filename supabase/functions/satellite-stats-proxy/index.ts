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

async function fetchCelesTrakGP(): Promise<any[]> {
  // CelesTrak GP data as JSON - active satellites
  const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('KEEPTRACK_API_KEY');

  try {
    // Try KeepTrack metrics first
    let totalActive = 0;
    let totalDebris = 0;
    
    if (apiKey) {
      try {
        const [activeCount, debrisCount] = await Promise.all([
          fetchKT('/metrics/active/count', apiKey),
          fetchKT('/metrics/debris/count', apiKey),
        ]);
        totalActive = typeof activeCount === 'number' ? activeCount : activeCount?.count || 0;
        totalDebris = typeof debrisCount === 'number' ? debrisCount : debrisCount?.count || 0;
      } catch (e) {
        console.log('KeepTrack metrics failed:', e.message);
      }
    }

    // Use CelesTrak GP data for orbit classification (more reliable than KeepTrack /sats/brief)
    const satellites = await fetchCelesTrakGP();
    
    const GM = 398600.4418;
    let leo = 0, meo = 0, geo = 0, heo = 0;
    const constellations: Record<string, number> = {};

    for (const sat of satellites) {
      const mm = sat.MEAN_MOTION;
      const ecc = sat.ECCENTRICITY || 0;
      const name = sat.OBJECT_NAME || '';
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

    // If KeepTrack metrics were empty, use CelesTrak count
    if (!totalActive) totalActive = satellites.length;

    return new Response(JSON.stringify({
      totalActive,
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
