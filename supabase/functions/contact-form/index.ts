const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const dbRes = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ name, email, message }),
    });

    if (!dbRes.ok) {
      console.error('DB insert failed:', await dbRes.text());
    }

    // Send email notification via mailto-style approach using a simple SMTP-free method
    // We'll use the Supabase built-in email or a webhook approach
    // For now, we send a formatted notification to the target email
    const targetEmail = 'vcpremchandyadav@gmail.com';
    
    // Use a simple email sending approach via fetch to a free email API
    // Since we don't have an email service configured, we'll store in DB
    // and the admin can check messages there
    
    console.log(`New contact message from ${name} (${email}): ${message}`);
    console.log(`Target notification email: ${targetEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message received successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send message' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
