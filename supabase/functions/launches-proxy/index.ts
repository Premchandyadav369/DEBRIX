const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // TheSpaceDevs Launch Library 2 - use normal mode for full details
    const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=normal';

    const response = await fetch(url);
    if (!response.ok) {
      // Fallback to list mode if rate limited
      const listRes = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list');
      if (!listRes.ok) throw new Error(`LL2 API returned ${listRes.status}`);
      const listData = await listRes.json();
      const launches = listData.results?.map((launch: any) => ({
        id: launch.id,
        name: launch.name,
        net: launch.net,
        status: launch.status?.name || 'Unknown',
        statusAbbrev: launch.status?.abbrev || 'UNK',
        provider: launch.launch_service_provider?.name || extractProvider(launch.name),
        rocket: launch.rocket?.configuration?.name || extractRocket(launch.name),
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
    }

    const data = await response.json();

    const launches = data.results?.map((launch: any) => ({
      id: launch.id,
      name: launch.name,
      net: launch.net,
      status: launch.status?.name || 'Unknown',
      statusAbbrev: launch.status?.abbrev || 'UNK',
      provider: launch.launch_service_provider?.name || extractProvider(launch.name),
      rocket: launch.rocket?.configuration?.name || extractRocket(launch.name),
      mission: launch.mission?.name || extractMission(launch.name),
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

// Extract provider from launch name like "Falcon 9 Block 5 | Starlink Group 17-35"
function extractProvider(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('falcon') || n.includes('starship')) return 'SpaceX';
  if (n.includes('long march') || n.includes('cz-')) return 'CASC';
  if (n.includes('soyuz')) return 'Roscosmos';
  if (n.includes('ariane')) return 'Arianespace';
  if (n.includes('vega')) return 'Arianespace';
  if (n.includes('electron')) return 'Rocket Lab';
  if (n.includes('atlas')) return 'ULA';
  if (n.includes('vulcan')) return 'ULA';
  if (n.includes('delta')) return 'ULA';
  if (n.includes('h-iia') || n.includes('h3')) return 'JAXA';
  if (n.includes('pslv') || n.includes('gslv')) return 'ISRO';
  if (n.includes('minotaur')) return 'Northrop Grumman';
  return 'Unknown';
}

function extractRocket(name: string): string {
  const parts = name.split('|');
  return parts[0]?.trim() || 'Unknown';
}

function extractMission(name: string): string | null {
  const parts = name.split('|');
  return parts[1]?.trim() || null;
}
