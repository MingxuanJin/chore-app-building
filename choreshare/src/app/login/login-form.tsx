"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Art } from "@/components/fawn";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { translateError } from "@/lib/i18n/errors";

export function LoginForm({ confirmError }: { confirmError: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(confirmError ? t("errors.confirm_link") : null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(t, error.message));
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(translateError(t, error.message));
      } else if (data.session) {
        router.replace("/setup");
        router.refresh();
      } else {
        setInfo(t("login.checkEmail"));
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-4">
      <div className="flex flex-col items-center">
        <Art name="rabbit" className="w-28" priority />
        <h1 className="-mt-2 font-script text-[64px] font-normal leading-[72px] pudding:mt-1 pudding:text-[44px] pudding:leading-[52px]">BunnyChore</h1>
        <p className="font-serif text-lg italic text-muted-foreground">{t("login.tagline")}</p>
      </div>

      <Card lace className="w-full max-w-sm">
        <CardContent className="pt-5">
          <Segmented
            className="mb-5"
            value={mode}
            onChange={setMode}
            options={[
              { value: "login", label: t("login.login") },
              { value: "signup", label: t("login.signup") },
            ]}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">{t("login.nickname")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("login.nicknamePlaceholder")} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-success">{info}</p>}
            <Button type="submit" className="mt-1" disabled={loading}>
              {loading ? t("common.pleaseWait") : mode === "login" ? t("login.login") : t("login.signup")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <LanguageSwitcher className="w-full max-w-sm" />
    </div>
  );
}
