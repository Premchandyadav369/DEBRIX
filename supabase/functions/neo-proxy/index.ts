const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // NASA NeoWs - Near Earth Object Web Service (free with DEMO_KEY)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    const startStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=DEMO_KEY`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NASA NEO API returned ${response.status}`);
    }

    const data = await response.json();

    // Flatten all NEOs from the date-keyed object
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

    // Sort by closest approach
    allNeos.sort((a, b) => a.missDistanceKm - b.missDistanceKm);

    return new Response(JSON.stringify({
      count: data.element_count,
      asteroids: allNeos.slice(0, 30),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('NEO proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
