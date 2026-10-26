"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { translateError } from "@/lib/i18n/errors";

export function SetupForm({ name }: { name: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [familyName, setFamilyName] = useState(() => t("setup.defaultFamilyName"));
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "create" | "join") {
    setLoading(kind);
    setError(null);
    const supabase = createClient();
    const { error } =
      kind === "create"
        ? await supabase.rpc("create_family", { family_name: familyName })
        : await supabase.rpc("join_family", { code });
    setLoading(null);
    if (error) return setError(translateError(t, error.message));
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">{name ? t("setup.hello", { name }) : t("setup.helloNoName")}</h1>
        <p className="text-muted-foreground">{t("setup.intro")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-4 w-4" /> {t("setup.createTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="family">{t("setup.spaceName")}</Label>
            <Input id="family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
          </div>
          <Button onClick={() => run("create")} disabled={loading !== null}>
            {loading === "create" ? t("setup.creating") : t("setup.create")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> {t("setup.joinTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">{t("setup.pairCode")}</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("setup.pairCodePlaceholder")}
              className="font-mono tracking-widest"
              maxLength={6}
            />
          </div>
          <Button variant="outline" onClick={() => run("join")} disabled={loading !== null || code.trim().length < 6}>
            {loading === "join" ? t("setup.joining") : t("setup.join")}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <LanguageSwitcher />
    </div>
  );
}
