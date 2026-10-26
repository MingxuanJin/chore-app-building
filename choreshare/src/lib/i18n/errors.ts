import type { TFunction, TKey } from "./translate";

// Database functions raise "code" or "code:arg1:arg2"; Supabase Auth returns English messages.
const AUTH_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, "invalid_credentials"],
  [/already registered/i, "user_exists"],
  [/password should be at least/i, "weak_password"],
  [/email not confirmed/i, "email_not_confirmed"],
];

const KNOWN = new Set([
  "not_authenticated",
  "already_in_family",
  "invalid_pair_code",
  "family_full",
  "task_not_found",
  "task_not_in_review",
  "cannot_review_own_task",
  "reward_not_found",
  "reward_not_redeemable",
  "insufficient_points",
  "invalid_credentials",
  "user_exists",
  "weak_password",
  "email_not_confirmed",
  "confirm_link",
]);

export function translateError(t: TFunction, message: string): string {
  const [code, ...args] = message.split(":");
  if (KNOWN.has(code)) {
    if (code === "insufficient_points") return t("errors.insufficient_points", { balance: args[0], cost: args[1] });
    return t(`errors.${code}` as TKey);
  }
  for (const [pattern, key] of AUTH_ERRORS) {
    if (pattern.test(message)) return t(`errors.${key}` as TKey);
  }
  return t("errors.generic", { message });
}
