import { cookies } from "next/headers";

import { LOCALE_COOKIE } from "./cookie";
import { format, locales, messages, type Locale, type MessageKey } from "./messages";

const DEFAULT_LOCALE: Locale = "zh-TW";

/**
 * Read the active locale from the request cookie. Falls back to the default
 * when the cookie is absent or holds an unknown value (e.g. first visit).
 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  return value && (locales as string[]).includes(value) ? value : DEFAULT_LOCALE;
}

/** Server-side translator. Mirrors the shape of the client `t()` from useT. */
export async function getServerT() {
  const locale = await getServerLocale();
  const dict = messages[locale];
  const fallback = messages.en;
  return (key: MessageKey, vars?: Record<string, string | number>) => {
    const template = dict[key] ?? fallback[key] ?? key;
    return format(template, vars);
  };
}
