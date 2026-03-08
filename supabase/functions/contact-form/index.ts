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

    // Send email notification via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'Message saved but email notification failed (no API key)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'DEBRIX Contact <onboarding@resend.dev>',
        to: ['vcpremchandyadav@gmail.com'],
        subject: `[DEBRIX] New message from ${name}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0ea5e9, #2dd4bf); padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 20px; color: #0d1117; letter-spacing: 2px;">DEBRIX — New Contact Message</h1>
            </div>
            <div style="padding: 32px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #8b949e; font-size: 13px; width: 80px;">Name</td>
                  <td style="padding: 8px 0; color: #e6edf3; font-size: 14px; font-weight: 600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #8b949e; font-size: 13px;">Email</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0ea5e9; text-decoration: none; font-size: 14px;">${email}</a></td>
                </tr>
              </table>
              <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-top: 8px;">
                <p style="margin: 0 0 4px 0; color: #8b949e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
                <p style="margin: 0; color: #e6edf3; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="margin-top: 24px; color: #484f58; font-size: 11px; text-align: center;">Sent from DEBRIX Mission Control</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend email failed:', emailRes.status, errText);
    } else {
      console.log('Email notification sent successfully');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully' }),
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
