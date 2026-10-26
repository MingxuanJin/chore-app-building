import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { isLocale } from "@/lib/i18n/config";
import { makeT } from "@/lib/i18n/translate";
import { notificationHref, notificationText } from "@/lib/notifications";
import type { AppNotification } from "@/types/database";

// Called by the push_on_notification DB trigger (via pg_net) for every new notification.
export const runtime = "nodejs";

interface PushBody {
  notification: AppNotification;
  locale: string;
  subject_name: string | null;
  subscriptions: { endpoint: string; p256dh: string; auth: string }[];
}

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as PushBody;
  const t = makeT(isLocale(body.locale) ? body.locale : "en");
  const n = body.notification;

  const payload = JSON.stringify({
    title: "ChoreShare",
    body: notificationText(t, n, body.subject_name || t("common.partner")),
    url: notificationHref(n),
    tag: n.id,
  });

  // VAPID "subject" must be an https: or mailto: contact for the push service
  const origin = request.nextUrl.origin;
  webpush.setVapidDetails(
    origin.startsWith("https:") ? origin : "mailto:admin@localhost",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    body.subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
        });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else console.error("push failed", status, (err as Error).message);
      }
    })
  );

  // Clean up subscriptions the push service says no longer exist
  if (gone.length) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    await supabase.rpc("delete_push_subscriptions", { p_secret: secret, p_endpoints: gone });
  }

  return NextResponse.json({ sent, failed: body.subscriptions.length - sent, removed: gone.length });
}
