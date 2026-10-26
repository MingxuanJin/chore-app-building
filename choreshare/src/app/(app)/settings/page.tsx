"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useFamily } from "@/components/family-provider";

export default function SettingsPage() {
  const router = useRouter();
  const { me, partner, family } = useFamily();
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
      <h1 className="text-xl font-bold">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>配对</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {partner ? (
            <p>
              已和 <span className="font-semibold">{partner.name || partner.email}</span> 配对 💞
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">把配对码发给对方，TA 注册后输入即可加入：</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-center font-mono text-2xl tracking-[0.3em]">
                  {family.pair_code}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  aria-label="复制配对码"
                  onClick={async () => {
                    await navigator.clipboard.writeText(family.pair_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <Copy />
                </Button>
              </div>
              {copied && <p className="text-xs text-success">已复制</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>资料</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">我的昵称</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="family">家庭空间名称</Label>
              <Input id="family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">登录邮箱：{me.email}</p>
            <Button type="submit">{saved ? "已保存 ✓" : "保存"}</Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={logout}>
        <LogOut /> 退出登录
      </Button>
    </div>
  );
}
