const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = 'WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz';
    const photos: any[] = [];

    // Try Curiosity latest photos first (most reliable)
    for (const rover of ['curiosity', 'perseverance']) {
      if (photos.length >= 12) break;
      try {
        const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${apiKey}`;
        console.log(`Fetching: ${rover} latest_photos`);
        const res = await fetch(url);
        console.log(`${rover} status: ${res.status}`);
        if (res.ok) {
          const data = await res.json();
          console.log(`${rover} latest_photos count: ${data.latest_photos?.length || 0}`);
          if (data.latest_photos?.length) {
            photos.push(...data.latest_photos.slice(0, 6));
          }
        } else {
          const errText = await res.text();
          console.log(`${rover} error: ${errText.substring(0, 200)}`);
        }
      } catch (e) {
        console.log(`${rover} fetch error: ${e.message}`);
      }
    }

    // Fallback: try by earth_date (today and recent days)
    if (photos.length === 0) {
      const today = new Date();
      for (let daysBack = 1; daysBack <= 10; daysBack++) {
        if (photos.length >= 12) break;
        const d = new Date(today.getTime() - daysBack * 86400000);
        const dateStr = d.toISOString().split('T')[0];
        try {
          const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?earth_date=${dateStr}&api_key=${apiKey}`;
          console.log(`Trying earth_date: ${dateStr}`);
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.photos?.length) {
              console.log(`Found ${data.photos.length} photos for ${dateStr}`);
              photos.push(...data.photos.slice(0, 12));
              break;
            }
          } else {
            await res.text();
          }
        } catch {}
      }
    }

    console.log(`Total photos found: ${photos.length}`);

    return new Response(JSON.stringify({ photos: photos.slice(0, 12) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mars rover error:', error);
    return new Response(JSON.stringify({ error: error.message, photos: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
