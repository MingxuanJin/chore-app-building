"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupForm({ name }: { name: string }) {
  const router = useRouter();
  const [familyName, setFamilyName] = useState("我们的家");
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
    if (error) return setError(error.message);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">你好{name ? `，${name}` : ""} 👋</h1>
        <p className="text-muted-foreground">先创建一个家庭空间，或用对方的配对码加入。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-4 w-4" /> 创建家庭空间
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="family">空间名称</Label>
            <Input id="family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
          </div>
          <Button onClick={() => run("create")} disabled={loading !== null}>
            {loading === "create" ? "创建中…" : "创建"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> 加入对方的空间
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">配对码</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 位配对码"
              className="font-mono tracking-widest"
              maxLength={6}
            />
          </div>
          <Button variant="outline" onClick={() => run("join")} disabled={loading !== null || code.trim().length < 6}>
            {loading === "join" ? "加入中…" : "加入"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
