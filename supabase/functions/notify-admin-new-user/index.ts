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
    const { userEmail, userName }: NewUserNotification = await req.json();

    if (!userEmail || !userName) {
      throw new Error("Missing required fields: userEmail and userName");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists and was recently created (within 10 minutes)
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error("Error listing users:", usersError);
      throw new Error("Failed to verify user");
    }

    const matchingUser = usersData.users.find((u) => u.email === userEmail);
    if (!matchingUser) {
      console.log(`User with email ${userEmail} not found`);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userCreatedAt = new Date(matchingUser.created_at!);
    const now = new Date();
    const diffMinutes = (now.getTime() - userCreatedAt.getTime()) / 1000 / 60;

    if (diffMinutes > 10) {
      console.log(`User ${userEmail} created ${diffMinutes.toFixed(1)} minutes ago - rejecting`);
      return new Response(
        JSON.stringify({ error: "This function can only be called during signup" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin user IDs
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

    const adminUserIds = adminRoles.map((r: { user_id: string }) => r.user_id);
    const adminEmails = usersData.users
      .filter((user) => adminUserIds.includes(user.id))
      .map((user) => user.email)
      .filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending notification to ${adminEmails.length} admin(s) for new user: ${userEmail}`);

    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
