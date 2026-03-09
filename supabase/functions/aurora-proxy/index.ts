const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch planetary Kp index (3-day forecast)
    const kpRes = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json');
    const kpData = await kpRes.json();

    // Fetch current Kp from wing-kp
    const wingRes = await fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json');
    const wingData = await wingRes.json();

    // Fetch 27-day outlook
    const outlookRes = await fetch('https://services.swpc.noaa.gov/products/27-day-outlook.json');
    const outlookData = await outlookRes.json();

    // Fetch aurora forecast map data (northern hemisphere)
    // This gives the aurora probability for each point
    const auroraRes = await fetch('https://services.swpc.noaa.gov/products/animations/ovation_north_24h.json');
    let auroraFrames: string[] = [];
    try {
      const auroraData = await auroraRes.json();
      if (Array.isArray(auroraData)) {
        auroraFrames = auroraData.slice(-3).map((f: any) => `https://services.swpc.noaa.gov${f.url}`);
      }
    } catch {}

    return new Response(JSON.stringify({
      kpForecast: kpData,
      solarWind: wingData,
      outlook: outlookData?.slice(0, 10),
      auroraFrames,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
