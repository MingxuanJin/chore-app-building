"use client";

import { createContext, useCallback, useContext } from "react";
import type { FamilyContextValue } from "@/lib/family";

interface FamilyCtx extends FamilyContextValue {
  /** Display name for a user id: "我" for self, partner's name otherwise */
  nameOf: (id: string | null | undefined) => string;
}

const Ctx = createContext<FamilyCtx | null>(null);

export function FamilyProvider({ value, children }: { value: FamilyContextValue; children: React.ReactNode }) {
  const nameOf = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "未分配";
      if (id === value.me.id) return "我";
      if (id === value.partner?.id) return value.partner.name || "TA";
      return "TA";
    },
    [value]
  );
  return <Ctx.Provider value={{ ...value, nameOf }}>{children}</Ctx.Provider>;
}

export function useFamily() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFamily must be used inside FamilyProvider");
  return ctx;
}
