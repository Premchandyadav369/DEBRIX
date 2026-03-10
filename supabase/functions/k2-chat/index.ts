const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const K2_API_URL = "https://api.k2think.ai/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const K2_API_KEY = Deno.env.get('K2_API_KEY');
    if (!K2_API_KEY) {
      return new Response(JSON.stringify({ error: 'K2_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, stream } = await req.json();

    const res = await fetch(K2_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${K2_API_KEY}`,
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        model: 'MBZUAI-IFM/K2-Think-v2',
        messages,
        stream: stream ?? true,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `K2 API error ${res.status}`, details: text }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
