const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // TheSpaceDevs Launch Library 2 - free tier (15 req/hr)
    const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`LL2 API returned ${response.status}`);
    }

    const data = await response.json();

    const launches = data.results?.map((launch: any) => ({
      id: launch.id,
      name: launch.name,
      net: launch.net, // No Earlier Than date
      status: launch.status?.name || 'Unknown',
      statusAbbrev: launch.status?.abbrev || 'UNK',
      provider: launch.launch_service_provider?.name || 'Unknown',
      rocket: launch.rocket?.configuration?.name || 'Unknown',
      mission: launch.mission?.name || null,
      missionType: launch.mission?.type || null,
      missionDescription: launch.mission?.description || null,
      orbit: launch.mission?.orbit?.name || null,
      pad: launch.pad?.name || null,
      padLocation: launch.pad?.location?.name || null,
      image: launch.image || null,
      webcastLive: launch.webcast_live || false,
    })) || [];

    return new Response(JSON.stringify(launches), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Launches proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
