"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useFamily } from "@/components/family-provider";
import { useI18n } from "@/components/i18n-provider";
import { PageHeader } from "@/components/fawn";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PushToggle } from "@/components/push-toggle";
import { DataExport } from "@/components/data-export";

export default function SettingsPage() {
  const router = useRouter();
  const { me, partner, family } = useFamily();
  const { t } = useI18n();
  const [name, setName] = useState(me.name);
  const [familyName, setFamilyName] = useState(family.name);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    await Promise.all([
      supabase.from("profiles").update({ name: name.trim() }).eq("id", me.id),
      supabase.from("families").update({ name: familyName.trim() || family.name }).eq("id", family.id),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow={t("deco.settings")} title={t("settings.title")} art="angelBunny" />

      <Card>
        <CardHeader>
          <CardTitle>{t("common.language")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("settings.languageHint")}</p>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>{t("settings.push")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("settings.pushHint")}</p>
        </CardHeader>
        <CardContent>
          <PushToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.pairing")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {partner ? (
            <p>
              {t("settings.pairedWith", { name: partner.name || partner.email })}
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">{t("settings.shareCode")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-xs bg-kraft px-3 py-2 text-center font-mono text-2xl tracking-[0.3em] outline-[5px] outline-dotted -outline-offset-2 outline-card">
                  {family.pair_code}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  aria-label={t("settings.copyCode")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(family.pair_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <Copy />
                </Button>
              </div>
              {copied && <p className="text-xs text-success">{t("settings.copied")}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("settings.nickname")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="family">{t("settings.familyName")}</Label>
              <Input id="family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.loginEmail", { email: me.email })}</p>
            <Button type="submit">{saved ? t("common.saved") : t("common.save")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("export.title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("export.hint")}</p>
        </CardHeader>
        <CardContent>
          <DataExport />
        </CardContent>
      </Card>

      <Button variant="outline" onClick={logout}>
        <LogOut /> {t("settings.logout")}
      </Button>
    </div>
  );
}
