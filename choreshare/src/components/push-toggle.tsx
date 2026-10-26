"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useFamily } from "./family-provider";
import { useI18n } from "./i18n-provider";

type Status = "loading" | "unsupported" | "notready" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentStatus(): Promise<Status> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  // the service worker is only registered in production builds
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "notready";
  if (Notification.permission === "denied") return "denied";
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

export function PushToggle() {
  const { me } = useFamily();
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    currentStatus().then(setStatus);
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const json = sub.toJSON();
      const { error } = await createClient()
        .from("push_subscriptions")
        .upsert(
          { user_id: me.id, endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth, locale },
          { onConflict: "endpoint" }
        );
      if (error) throw new Error(error.message);
      setStatus("on");
    } catch (e) {
      setError(t("settings.pushError", { message: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
    setBusy(false);
  }

  if (status === "loading") return null;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {status === "unsupported" && <p className="text-muted-foreground">{t("settings.pushUnsupported")}</p>}
      {status === "notready" && <p className="text-muted-foreground">{t("settings.pushNotReady")}</p>}
      {status === "denied" && <p className="text-destructive">{t("settings.pushDenied")}</p>}
      {status === "on" && (
        <>
          <p>{t("settings.pushOn")}</p>
          <Button variant="outline" disabled={busy} onClick={disable}>
            <BellOff /> {t("settings.pushDisable")}
          </Button>
        </>
      )}
      {status === "off" && (
        <Button disabled={busy} onClick={enable}>
          <Bell /> {t("settings.pushEnable")}
        </Button>
      )}
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}
