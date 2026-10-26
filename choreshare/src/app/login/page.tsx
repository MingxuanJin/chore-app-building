"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setError(error.message === "Invalid login credentials" ? "邮箱或密码错误" : error.message);
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
        setError(error.message);
      } else if (data.session) {
        router.replace("/setup");
        router.refresh();
      } else {
        setInfo("注册成功！请查收邮箱中的确认链接，确认后即可登录。");
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
        <p className="text-muted-foreground">一起把家照顾好</p>
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
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">昵称</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="对方会看到这个名字" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">密码</Label>
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
              {loading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
