const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE = 'https://api.keeptrack.space/v4';

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
    // Use KeepTrack's stats/recent-launches for recently launched objects
    const recentRes = await fetch(`${BASE}/stats/recent-launches`, {
      headers: { 'X-API-Key': apiKey },
    });
    
    let recentSats: any[] = [];
    if (recentRes.ok) {
      const data = await recentRes.json();
      recentSats = Array.isArray(data) ? data : [];
    }

    // Also get LEO objects to find low-perigee objects for reentry prediction
    const leoRes = await fetch(`${BASE}/sats/leo`, {
      headers: { 'X-API-Key': apiKey },
    });

    let leoSats: any[] = [];
    if (leoRes.ok) {
      const data = await leoRes.json();
      leoSats = Array.isArray(data) ? data : [];
    }

    const GM = 398600.4418;
    const reentryObjects = leoSats
      .map((sat: any) => {
        try {
          const mm = sat.MEAN_MOTION || sat.meanMotion;
          const ecc = sat.ECCENTRICITY || sat.eccentricity || 0;
          const inc = sat.INCLINATION || sat.inclination || 0;
          const name = sat.OBJECT_NAME || sat.name || 'UNKNOWN';
          const noradId = sat.NORAD_CAT_ID || sat.satId || sat.id || '';
          const tle1 = sat.TLE_LINE1 || sat.tle1 || '';
          const tle2 = sat.TLE_LINE2 || sat.tle2 || '';

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
