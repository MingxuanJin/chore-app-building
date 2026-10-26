"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-primary" fill="currentColor" />
          <h1 className="text-3xl font-bold tracking-tight">ChoreShare</h1>
        </div>
        <p className="text-muted-foreground">{t("login.tagline")}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-4">
          <div className="mb-4 grid grid-cols-2 rounded-md bg-muted p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? t("login.login") : t("login.signup")}
              </button>
            ))}
          </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? t("common.pleaseWait") : mode === "login" ? t("login.login") : t("login.signup")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <LanguageSwitcher className="w-full max-w-sm" />
    </div>
  );
}
