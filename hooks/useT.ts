"use client";

import { useCallback } from "react";
import { enUS, zhTW } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

import { format, messages, type MessageKey } from "@/lib/i18n/messages";
import { useLocaleStore } from "@/store/useLocaleStore";

export function useT() {
  const locale = useLocaleStore((s) => s.locale);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const dict = messages[locale];
      const fallback = messages.en;
      const template = dict[key] ?? fallback[key] ?? key;
      return format(template, vars);
    },
    [locale],
  );

  const dateLocale: DateFnsLocale = locale === "zh-TW" ? zhTW : enUS;

  return { t, locale, dateLocale };
}

// For mapping API-provided English label strings into the active locale.
export function useReadingLabel() {
  const { t } = useT();
  return (label: string) => {
    const key = `readingLabel.${label}` as MessageKey;
    const translated = t(key);
    return translated === key ? label : translated;
  };
}
