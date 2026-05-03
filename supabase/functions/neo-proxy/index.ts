const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory cache (per cold start)
let cache: { ts: number; payload: any } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  try {
    const apiKey = Deno.env.get('NASA_API_KEY') || 'DEMO_KEY';
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    const startStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=${apiKey}`;

    const response = await fetch(url);

    if (response.status === 429 || !response.ok) {
      // Rate-limited or upstream failure: return graceful payload (200) with stale cache or empty list
      const fallback = cache?.payload || { count: 0, asteroids: [], warning: 'NASA NEO API rate-limited; showing empty feed. Using DEMO_KEY — set NASA_API_KEY secret for higher quota.' };
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': cache ? 'STALE' : 'EMPTY' },
      });
    }

    const data = await response.json();
    const allNeos: any[] = [];
    for (const date of Object.keys(data.near_earth_objects || {})) {
      for (const neo of data.near_earth_objects[date]) {
        const closeApproach = neo.close_approach_data?.[0];
        allNeos.push({
          id: neo.id,
          name: neo.name,
          nasaUrl: neo.nasa_jpl_url,
          absoluteMagnitude: neo.absolute_magnitude_h,
          estimatedDiameterMin: neo.estimated_diameter?.meters?.estimated_diameter_min,
          estimatedDiameterMax: neo.estimated_diameter?.meters?.estimated_diameter_max,
          isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
          closeApproachDate: closeApproach?.close_approach_date_full,
          relativeVelocityKmh: parseFloat(closeApproach?.relative_velocity?.kilometers_per_hour || '0'),
          relativeVelocityKms: parseFloat(closeApproach?.relative_velocity?.kilometers_per_second || '0'),
          missDistanceKm: parseFloat(closeApproach?.miss_distance?.kilometers || '0'),
          missDistanceLunar: parseFloat(closeApproach?.miss_distance?.lunar || '0'),
          orbitingBody: closeApproach?.orbiting_body,
        });
      }
    }
    allNeos.sort((a, b) => a.missDistanceKm - b.missDistanceKm);

    const payload = { count: data.element_count, asteroids: allNeos.slice(0, 30) };
    cache = { ts: Date.now(), payload };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('NEO proxy error:', error);
    const fallback = cache?.payload || { count: 0, asteroids: [], warning: (error as Error).message };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'ERROR' },
    });
  }
});
