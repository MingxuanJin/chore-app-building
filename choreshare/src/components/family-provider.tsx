"use client";

import { createContext, useCallback, useContext } from "react";
import type { FamilyContextValue } from "@/lib/family";
import { useI18n } from "./i18n-provider";

interface FamilyCtx extends FamilyContextValue {
  /** Display name for a user id: "You" for self, partner's name otherwise */
  nameOf: (id: string | null | undefined) => string;
}

const Ctx = createContext<FamilyCtx | null>(null);

export function FamilyProvider({ value, children }: { value: FamilyContextValue; children: React.ReactNode }) {
  const { t } = useI18n();
  const nameOf = useCallback(
    (id: string | null | undefined) => {
      if (!id) return t("common.unassigned");
      if (id === value.me.id) return t("common.you");
      if (id === value.partner?.id) return value.partner.name || t("common.partner");
      return t("common.partner");
    },
    [value, t]
  );
  return <Ctx.Provider value={{ ...value, nameOf }}>{children}</Ctx.Provider>;
}

export function useFamily() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFamily must be used inside FamilyProvider");
  return ctx;
}
