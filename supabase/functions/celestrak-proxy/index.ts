const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch decaying objects directly from CelesTrak (no API key needed)
    const decayRes = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json');
    
    let recentSats: any[] = [];
    if (decayRes.ok) {
      const data = await decayRes.json();
      recentSats = Array.isArray(data) ? data : [];
    }

    const GM = 398600.4418;
    const reentryObjects = recentSats
      .map((sat: any) => {
        try {
          const mm = sat.MEAN_MOTION;
          const ecc = sat.ECCENTRICITY || 0;
          const inc = sat.INCLINATION || 0;
          const name = sat.OBJECT_NAME || 'UNKNOWN';
          const noradId = sat.NORAD_CAT_ID || '';
          const tle1 = sat.TLE_LINE1 || '';
          const tle2 = sat.TLE_LINE2 || '';

          if (!mm || mm <= 0) return null;

          const nRadPerSec = (mm * 2 * Math.PI) / 86400;
          const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
          const perigee = a * (1 - ecc) - 6371;
          const apogee = a * (1 + ecc) - 6371;

          if (perigee < 400 && perigee > 50) {
            return {
              name, noradId: String(noradId), tle1, tle2,
              meanMotion: mm, eccentricity: ecc, inclination: inc,
              perigee: Math.round(perigee), apogee: Math.round(apogee),
            };
          }
          return null;
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.perigee - b.perigee)
      .slice(0, 40);

    // If no low-perigee objects from recent launches, try visual satellites (ISS etc)
    if (reentryObjects.length === 0) {
      const visRes = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json');
      if (visRes.ok) {
        const visData = await visRes.json();
        const visSats = Array.isArray(visData) ? visData : [];
        const lowOrbit = visSats
          .map((sat: any) => {
            const mm = sat.MEAN_MOTION;
            const ecc = sat.ECCENTRICITY || 0;
            if (!mm || mm <= 0) return null;
            const nRadPerSec = (mm * 2 * Math.PI) / 86400;
            const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
            const perigee = a * (1 - ecc) - 6371;
            const apogee = a * (1 + ecc) - 6371;
            if (perigee < 500 && perigee > 100) {
              return {
                name: sat.OBJECT_NAME || 'UNKNOWN',
                noradId: String(sat.NORAD_CAT_ID || ''),
                tle1: sat.TLE_LINE1 || '', tle2: sat.TLE_LINE2 || '',
                meanMotion: mm, eccentricity: ecc, inclination: sat.INCLINATION || 0,
                perigee: Math.round(perigee), apogee: Math.round(apogee),
              };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.perigee - b.perigee)
          .slice(0, 20);
        reentryObjects.push(...lowOrbit);
      }
    }

    return new Response(JSON.stringify(reentryObjects), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CelesTrak proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
