const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch GP data from CelesTrak for objects that recently decayed or have very low perigee
    // We'll fetch from multiple categories to get a good set of reentry candidates
    const categories = [
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
    ];

    const results = await Promise.allSettled(
      categories.map(url => fetch(url).then(r => r.json()))
    );

    const allObjects: any[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allObjects.push(...result.value);
      }
    }

    // Filter for objects with low perigee (< 400km) - potential reentry candidates
    // Calculate perigee from mean motion, eccentricity
    const reentryCandiates = allObjects
      .filter((obj: any) => {
        if (!obj.MEAN_MOTION || !obj.ECCENTRICITY) return false;
        const n = obj.MEAN_MOTION; // revs per day
        const e = obj.ECCENTRICITY;
        // Semi-major axis from mean motion: a = (GM / (2*pi*n/86400)^2)^(1/3)
        const GM = 398600.4418; // km^3/s^2
        const nRadPerSec = (n * 2 * Math.PI) / 86400;
        const a = Math.pow(GM / (nRadPerSec * nRadPerSec), 1 / 3);
        const perigee = a * (1 - e) - 6371; // altitude in km
        return perigee < 400 && perigee > 100; // low but not yet decayed
      })
      .slice(0, 30); // Limit to 30 objects

    return new Response(JSON.stringify(reentryCandiates), {
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
