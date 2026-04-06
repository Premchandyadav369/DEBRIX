const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Curated real Mars rover images from NASA's public image archive
const FALLBACK_PHOTOS = [
  { id: 1, img_src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04102/opgs/edr/ncam/NLB_781959413EDR_F1060814NCAM00353M_.JPG", earth_date: "2024-02-15", rover: { name: "Curiosity" }, camera: { full_name: "Navigation Camera" } },
  { id: 2, img_src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04102/opgs/edr/ncam/NRB_781959413EDR_F1060814NCAM00353M_.JPG", earth_date: "2024-02-15", rover: { name: "Curiosity" }, camera: { full_name: "Navigation Camera" } },
  { id: 3, img_src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04100/opgs/edr/fcam/FLB_781782871EDR_F1060814FHAZ00302M_.JPG", earth_date: "2024-02-13", rover: { name: "Curiosity" }, camera: { full_name: "Front Hazard Camera" } },
  { id: 4, img_src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04100/opgs/edr/fcam/FRB_781782871EDR_F1060814FHAZ00302M_.JPG", earth_date: "2024-02-13", rover: { name: "Curiosity" }, camera: { full_name: "Front Hazard Camera" } },
  { id: 5, img_src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04098/opgs/edr/ncam/NLB_781606223EDR_F1060814NCAM00353M_.JPG", earth_date: "2024-02-11", rover: { name: "Curiosity" }, camera: { full_name: "Navigation Camera" } },
  { id: 6, img_src: "https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/04098/opgs/edr/ncam/NRB_781606223EDR_F1060814NCAM00353M_.JPG", earth_date: "2024-02-11", rover: { name: "Curiosity" }, camera: { full_name: "Navigation Camera" } },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = 'WBkaFckn04xcJlW4NoleN07iZajebOJGZpT4LrZz';
    const photos: any[] = [];

    // Try the primary NASA Mars Photos API
    for (const rover of ['curiosity', 'perseverance']) {
      if (photos.length >= 12) break;
      try {
        // Use HTTPS explicitly
        const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${apiKey}`;
        const res = await fetch(url, { 
          headers: { 'Accept': 'application/json' },
          redirect: 'follow',
        });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('json')) {
            const data = await res.json();
            if (data.latest_photos?.length) {
              photos.push(...data.latest_photos.slice(0, 6));
            }
          } else {
            await res.text();
          }
        } else {
          await res.text();
        }
      } catch {
        // next
      }
    }

    // If NASA API is down, use curated fallback images
    const finalPhotos = photos.length > 0 ? photos.slice(0, 12) : FALLBACK_PHOTOS;

    return new Response(JSON.stringify({ 
      photos: finalPhotos,
      source: photos.length > 0 ? 'live' : 'cached',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, photos: FALLBACK_PHOTOS, source: 'cached' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
