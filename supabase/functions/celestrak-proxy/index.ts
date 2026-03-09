const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch TLE data from CelesTrak for recently launched objects (most likely to have low perigees)
    const tleUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=tle';
    const stationsUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';

    const [tleRes, stationsRes] = await Promise.allSettled([
      fetch(tleUrl).then(r => r.text()),
      fetch(stationsUrl).then(r => r.text()),
    ]);

    const allTles: { name: string; tle1: string; tle2: string }[] = [];

    for (const result of [tleRes, stationsRes]) {
      if (result.status === 'fulfilled') {
        const lines = result.value.trim().split('\n').map((l: string) => l.trim());
        for (let i = 0; i < lines.length - 2; i += 3) {
          if (lines[i + 1]?.startsWith('1 ') && lines[i + 2]?.startsWith('2 ')) {
            allTles.push({
              name: lines[i],
              tle1: lines[i + 1],
              tle2: lines[i + 2],
            });
          }
        }
      }
    }

    // Calculate perigee and filter for low-perigee objects
    const GM = 398600.4418;
    const reentryObjects = allTles
      .map(({ name, tle1, tle2 }) => {
        try {
          // Parse mean motion and eccentricity from TLE line 2
          const meanMotion = parseFloat(tle2.substring(52, 63).trim());
          const eccStr = '0.' + tle2.substring(26, 33).trim();
          const eccentricity = parseFloat(eccStr);
          const inclination = parseFloat(tle2.substring(8, 16).trim());
          const noradId = tle1.substring(2, 7).trim();

          const nRadPerSec = (meanMotion * 2 * Math.PI) / 86400;
          const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
          const perigee = a * (1 - eccentricity) - 6371;
          const apogee = a * (1 + eccentricity) - 6371;

          if (perigee < 400 && perigee > 50) {
            return {
              name,
              noradId,
              tle1,
              tle2,
              meanMotion,
              eccentricity,
              inclination,
              perigee: Math.round(perigee),
              apogee: Math.round(apogee),
            };
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.perigee - b.perigee)
      .slice(0, 40);

    return new Response(JSON.stringify(reentryObjects), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CelesTrak proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
