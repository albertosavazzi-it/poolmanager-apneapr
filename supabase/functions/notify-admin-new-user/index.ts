import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewUserNotification {
  userId?: string;
  userEmail: string;
  userName: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userEmail, userName }: NewUserNotification = await req.json();

    if (!userEmail || !userName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userEmail and userName" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Supabase environment variables not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify user exists and was recently created (within 15 minutes)
    let userCreatedAt: Date | null = null;

    if (userId) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (!userError && userData?.user?.created_at) {
        userCreatedAt = new Date(userData.user.created_at);
      } else if (userError) {
        console.warn(`getUserById failed for userId ${userId}:`, userError);
      }
    }

    if (!userCreatedAt) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });

      if (usersError) {
        console.error("Error listing users:", usersError);
        throw new Error("Failed to verify user");
      }

      const matchingUser = usersData.users.find(
        (u) => u.email?.trim().toLowerCase() === userEmail.trim().toLowerCase()
      );

      if (matchingUser?.created_at) {
        userCreatedAt = new Date(matchingUser.created_at);
      }
    }

    if (!userCreatedAt) {
      console.warn(`User with email ${userEmail} not found in auth.users`);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const now = new Date();
    const diffMinutes = (now.getTime() - userCreatedAt.getTime()) / 1000 / 60;

    if (diffMinutes > 15) {
      console.log(`User ${userEmail} created ${diffMinutes.toFixed(1)} minutes ago - rejecting notification`);
      return new Response(
        JSON.stringify({ error: "This function can only be called shortly after signup" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: Record<string, unknown> = {};

    // 2. Telegram Notification
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (telegramBotToken && telegramChatId) {
      try {
        const formattedDate = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
        const telegramMessage = 
          `🏊 *Nuova Registrazione Utente*\n\n` +
          `👤 *Nome:* ${userName}\n` +
          `📧 *Email:* ${userEmail}\n` +
          `📅 *Data:* ${formattedDate}`;

        const tgResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMessage,
            parse_mode: "Markdown",
          }),
        });

        const tgData = await tgResponse.json();
        if (tgData.ok) {
          console.log("Telegram notification sent successfully:", tgData);
          results.telegram = { success: true };
        } else {
          console.error("Telegram API returned error:", tgData);
          results.telegram = { success: false, error: tgData };
        }
      } catch (tgError) {
        console.error("Failed to send Telegram notification:", tgError);
        results.telegram = { success: false, error: tgError instanceof Error ? tgError.message : "Unknown error" };
      }
    } else {
      console.log("Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)");
    }

    // 3. Email Notification via Resend (optional fallback if configured)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const adminUserIds = adminRoles?.map((r: { user_id: string }) => r.user_id) ?? [];
        const adminEmails: string[] = [];

        for (const adminId of adminUserIds) {
          const { data: adminUser } = await supabase.auth.admin.getUserById(adminId);
          if (adminUser?.user?.email) {
            adminEmails.push(adminUser.user.email);
          }
        }

        const fallbackAdminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
        if (fallbackAdminEmail && !adminEmails.includes(fallbackAdminEmail)) {
          adminEmails.push(fallbackAdminEmail);
        }

        if (adminEmails.length > 0) {
          const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Pool Manager <noreply@apneapr.it>";
          const { Resend } = await import("https://esm.sh/resend@2.0.0");
          const resend = new Resend(resendApiKey);

          const { data: resendData, error: resendError } = await resend.emails.send({
            from: fromEmail,
            to: adminEmails,
            subject: `Nuova registrazione utente: ${userName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-top: 0;">Nuova Registrazione Utente</h2>
                <p style="color: #475569; font-size: 15px;">Un nuovo utente si è registrato su <strong>Pool Manager</strong>:</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 6px 0;"><strong>Nome completo:</strong> ${userName}</p>
                  <p style="margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
                  <p style="margin: 6px 0;"><strong>Data:</strong> ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>
                </div>
              </div>
            `,
          });

          if (resendError) {
            results.email = { success: false, error: resendError };
          } else {
            results.email = { success: true, data: resendData };
          }
        }
      } catch (emailError) {
        results.email = { success: false, error: emailError instanceof Error ? emailError.message : "Unknown error" };
      }
    }

    // Check if at least one notification channel was triggered or configured
    const hasConfiguredChannel = Boolean((telegramBotToken && telegramChatId) || resendApiKey);
    if (!hasConfiguredChannel) {
      console.warn("No notification channels configured (neither Telegram nor Resend)");
      return new Response(
        JSON.stringify({ 
          warning: "No notification channels configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Supabase Secrets.",
          success: false 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-admin-new-user function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
