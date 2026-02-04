import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewUserNotification {
  userEmail: string;
  userName: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dynamic import for Resend
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { userEmail, userName }: NewUserNotification = await req.json();

    if (!userEmail || !userName) {
      throw new Error("Missing required fields: userEmail and userName");
    }

    // Create Supabase client with service role to query admin emails
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admin user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from auth.users
    const adminUserIds = adminRoles.map((r: { user_id: string }) => r.user_id);
    const { data: adminUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching admin users:", usersError);
      throw new Error("Failed to fetch admin user details");
    }

    const adminEmails = adminUsers.users
      .filter((user: { id: string }) => adminUserIds.includes(user.id))
      .map((user: { email?: string }) => user.email)
      .filter((email: string | undefined): email is string => !!email);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending notification to ${adminEmails.length} admin(s)`);

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "Pool Manager <noreply@apneapr.it>",
      to: adminEmails,
      subject: "Nuova registrazione utente",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Nuova Registrazione</h1>
          <p>Un nuovo utente si è registrato sulla piattaforma:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nome:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Questa è una notifica automatica dal sistema Pool Manager.</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-admin-new-user function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
