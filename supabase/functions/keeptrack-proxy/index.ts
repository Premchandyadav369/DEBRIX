const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE = 'https://api.keeptrack.space/v4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('KEEPTRACK_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'KEEPTRACK_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { endpoint } = await req.json();
    if (!endpoint || typeof endpoint !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing endpoint parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Whitelist allowed endpoints
    const allowed = [
      '/metrics/active/count', '/metrics/inactive/count', '/metrics/payload/count', '/metrics/debris/count',
      '/socrates/latest', '/sats/debris', '/sats/leo', '/sats/geo', '/sats/brief',
      '/stats/popular', '/stats/recent-launches', '/stats/tle-age',
      '/catalog/latest', '/satcat/latest',
      '/launches',
    ];
    
    // Allow parameterized endpoints
    const isAllowed = allowed.includes(endpoint) ||
      /^\/sat\/[\w-]+(\/(summary|trivia|tle|tles|omm|eci|ecf|lla|rae|radec))?/.test(endpoint) ||
      /^\/sats\/celestrak/.test(endpoint) ||
      /^\/sats\/latest/.test(endpoint) ||
      /^\/sats\/[A-Za-z0-9%\-_\s]+$/.test(endpoint) ||
      /^\/positions\/[\d\.\-\/]+/.test(endpoint) ||
      /^\/radiopasses\/[\d\.\-\/]+/.test(endpoint) ||
      /^\/launch-vehicle\//.test(endpoint) ||
      /^\/tle\/\d+/.test(endpoint);

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${BASE}${endpoint}`, {
      headers: { 'X-API-Key': apiKey },
    });

    const contentType = response.headers.get('content-type') || '';
    let body: any;
    if (contentType.includes('json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return new Response(JSON.stringify(body), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('KeepTrack proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
