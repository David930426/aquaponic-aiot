"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useT";

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6F8] p-6 text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">
        {t("notFound.title")}
      </h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {t("notFound.subtitle")}
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">{t("notFound.back")}</Link>
      </Button>
    </div>
  );
}
