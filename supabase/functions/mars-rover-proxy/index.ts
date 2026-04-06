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

    // Try latest photos from multiple rovers
    for (const rover of ['curiosity', 'perseverance', 'opportunity', 'spirit']) {
      if (photos.length >= 12) break;
      try {
        const res = await fetch(
          `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${apiKey}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.latest_photos?.length) {
            photos.push(...data.latest_photos.slice(0, 6));
          }
        } else {
          await res.text(); // consume body
        }
      } catch {
        // Try next rover
      }
    }

    // Fallback: try Curiosity by recent sols
    if (photos.length === 0) {
      for (let sol = 4200; sol >= 3900; sol -= 100) {
        try {
          const res = await fetch(
            `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=${sol}&camera=NAVCAM&api_key=${apiKey}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.photos?.length) {
              photos.push(...data.photos.slice(0, 12));
              break;
            }
          } else {
            await res.text();
          }
        } catch {}
      }
    }

    // Second fallback: try FHAZ camera
    if (photos.length === 0) {
      try {
        const res = await fetch(
          `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=4000&camera=FHAZ&api_key=${apiKey}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.photos?.length) {
            photos.push(...data.photos.slice(0, 12));
          }
        } else {
          await res.text();
        }
      } catch {}
    }

    return new Response(JSON.stringify({ photos: photos.slice(0, 12) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, photos: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
