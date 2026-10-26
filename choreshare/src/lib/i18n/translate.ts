import type { Dict } from "./dict/zh";
import { zh } from "./dict/zh";
import { en } from "./dict/en";
import { it } from "./dict/it";
import type { Locale } from "./config";

export const DICTS: Record<Locale, Dict> = { zh, en, it };

// "a.b.c" paths to every string leaf of the dictionary
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dict>;
export type TParams = Record<string, string | number>;
export type TFunction = (key: TKey, params?: TParams) => string;

export function makeT(locale: Locale): TFunction {
  const dict = DICTS[locale];
  return (key, params) => {
    let value: unknown = dict;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)?.[part];
    if (typeof value !== "string") return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
  };
}
