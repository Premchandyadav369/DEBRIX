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

    // Retry with exponential backoff for transient failures (esp. /socrates/latest).
    // Retry on network errors and 5xx / 429. Do NOT retry on 4xx (except 429).
    const isSocrates = endpoint.startsWith('/socrates');
    const maxAttempts = isSocrates ? 4 : 2;
    const baseDelayMs = 300;

    let response: Response | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        response = await fetch(`${BASE}${endpoint}`, {
          headers: { 'X-API-Key': apiKey },
        });
        const retryable = response.status >= 500 || response.status === 429 || response.status === 408;
        if (!retryable) break;
        lastErr = new Error(`Upstream ${response.status}`);
      } catch (err) {
        lastErr = err;
        response = null;
      }
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
        console.warn(`KeepTrack ${endpoint} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (!response) {
      const softEndpoints = /^\/(socrates|radiopasses|positions|sat\/[\w-]+\/(eci|ecf|lla|rae|radec|tle|tles|omm))/;
      if (softEndpoints.test(endpoint)) {
        console.warn(`KeepTrack network failure on ${endpoint} after ${maxAttempts} attempts — empty set`);
        return new Response(JSON.stringify({ data: [], passes: [], warning: (lastErr as Error)?.message || 'Upstream unreachable', fallback: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw lastErr ?? new Error('Upstream fetch failed');
    }

    const contentType = response.headers.get('content-type') || '';
    let body: any;
    if (contentType.includes('json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    // Graceful degradation: KeepTrack returns 422 ("Propagation failed — TLE may be stale or invalid")
    // for decayed/invalid satellites on /radiopasses, /positions, /sat/*/eci etc.
    // Convert these (and other upstream errors on read-only orbital endpoints) into a 200 empty
    // payload so the client UI can skip them silently instead of blowing up.
    if (!response.ok) {
      const softEndpoints = /^\/(socrates|radiopasses|positions|sat\/[\w-]+\/(eci|ecf|lla|rae|radec|tle|tles|omm))/;
      if (response.status === 422 || softEndpoints.test(endpoint)) {
        console.warn(`KeepTrack ${response.status} on ${endpoint} — returning empty set`);
        return new Response(JSON.stringify({ data: [], passes: [], warning: (body as any)?.error || `Upstream ${response.status}` }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify(body), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('KeepTrack proxy error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message, data: [], passes: [], fallback: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
