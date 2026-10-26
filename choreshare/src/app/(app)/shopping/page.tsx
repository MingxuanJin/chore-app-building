"use client";

import { useCallback, useState } from "react";
import { Check, Plus, Trash2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { ShoppingItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { useI18n } from "@/components/i18n-provider";
import { EmptyNote, PageHeader } from "@/components/fawn";

export default function ShoppingPage() {
  const { me, partner, family, nameOf } = useFamily();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [showPurchased, setShowPurchased] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await createClient()
      .from("shopping_items")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<ShoppingItem[]>();
    return data ?? [];
  }, []);
  const { data: serverItems, reload: load } = useLiveQuery(fetchItems, ["shopping_items"]);

  // Local copy for optimistic updates; re-synced whenever the server data changes
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [synced, setSynced] = useState(serverItems);
  if (serverItems !== synced) {
    setSynced(serverItems);
    setItems(serverItems ?? []);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    await createClient().from("shopping_items").insert({ family_id: family.id, name: trimmed, added_by: me.id });
    load();
  }

  async function update(id: string, patch: Partial<ShoppingItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await createClient().from("shopping_items").update(patch).eq("id", id);
    load();
  }

  async function togglePurchased(item: ShoppingItem) {
    await update(
      item.id,
      item.is_purchased
        ? { is_purchased: false, purchased_by: null, purchased_at: null }
        : { is_purchased: true, purchased_by: me.id, purchased_at: new Date().toISOString() }
    );
  }

  // Cycle 谁去买: nobody → me → partner → nobody
  async function cycleAssignee(item: ShoppingItem) {
    const order = [null, me.id, ...(partner ? [partner.id] : [])];
    const next = order[(order.indexOf(item.assigned_to) + 1) % order.length];
    await update(item.id, { assigned_to: next });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await createClient().from("shopping_items").delete().eq("id", id);
  }

  async function clearPurchased() {
    if (!confirm(t("shopping.confirmClear"))) return;
    await createClient().from("shopping_items").delete().eq("is_purchased", true).eq("family_id", family.id);
    load();
  }

  const todo = items.filter((i) => !i.is_purchased);
  const done = items
    .filter((i) => i.is_purchased)
    .sort((a, b) => (b.purchased_at ?? "").localeCompare(a.purchased_at ?? ""));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow={t("deco.shopping")} title={t("shopping.title")} art="asciiRabbit" />

      <form onSubmit={add} className="flex gap-2">
        <Input placeholder={t("shopping.placeholder")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" aria-label={t("common.add")}>
          <Plus />
        </Button>
      </form>

      <ul className="flex flex-col gap-2">
        {todo.length === 0 && <EmptyNote art="asciiLily">{t("shopping.empty")}</EmptyNote>}
        {todo.map((item) => (
          <Row key={item.id} item={item} onToggle={() => togglePurchased(item)} onRemove={() => remove(item.id)}>
            <button
              onClick={() => cycleAssignee(item)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                item.assigned_to ? "border-transparent bg-blush text-foreground" : "text-muted-foreground"
              )}
            >
              <UserRound className="h-3 w-3" />
              {item.assigned_to ? t("shopping.buyer", { name: nameOf(item.assigned_to) }) : t("shopping.whoBuys")}
            </button>
          </Row>
        ))}
      </ul>

      {done.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button className="font-serif text-lg font-semibold text-muted-foreground" onClick={() => setShowPurchased((v) => !v)}>
              {t("shopping.purchased", { n: done.length })} {showPurchased ? "▾" : "▸"}
            </button>
            {showPurchased && (
              <Button size="sm" variant="ghost" onClick={clearPurchased}>
                {t("shopping.clearPurchased")}
              </Button>
            )}
          </div>
          {showPurchased && (
            <ul className="flex flex-col gap-2 opacity-60">
              {done.map((item) => (
                <Row key={item.id} item={item} onToggle={() => togglePurchased(item)} onRemove={() => remove(item.id)}>
                  <span className="text-xs text-muted-foreground">{t("shopping.boughtBy", { name: nameOf(item.purchased_by) })}</span>
                </Row>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  onToggle,
  onRemove,
  children,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { nameOf } = useFamily();
  const { t } = useI18n();
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
      <button
        onClick={onToggle}
        aria-label={item.is_purchased ? t("shopping.markTodo") : t("shopping.markPurchased")}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          item.is_purchased ? "border-success/40 bg-sage text-success" : "border-input"
        )}
      >
        {item.is_purchased && <Check className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate", item.is_purchased && "line-through")}>{item.name}</p>
        <p className="text-xs text-muted-foreground">{t("shopping.addedBy", { name: nameOf(item.added_by) })}</p>
      </div>
      {children}
      <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive" aria-label={t("common.delete")}>
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
