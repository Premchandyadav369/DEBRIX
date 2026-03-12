const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function safeFetchJson(url: string, fallback: any = null) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      await res.text();
      return fallback;
    }
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [kpData, wingData, outlookData, auroraData] = await Promise.all([
      safeFetchJson('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', []),
      safeFetchJson('https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json', {}),
      safeFetchJson('https://services.swpc.noaa.gov/products/27-day-outlook.json', []),
      safeFetchJson('https://services.swpc.noaa.gov/products/animations/ovation_north_24h.json', []),
    ]);

    let auroraFrames: string[] = [];
    if (Array.isArray(auroraData)) {
      auroraFrames = auroraData.slice(-3).map((f: any) => `https://services.swpc.noaa.gov${f.url}`);
    }

    return new Response(JSON.stringify({
      kpForecast: kpData,
      solarWind: wingData,
      outlook: Array.isArray(outlookData) ? outlookData.slice(0, 10) : [],
      auroraFrames,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, kpForecast: [], solarWind: {}, outlook: [], auroraFrames: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
