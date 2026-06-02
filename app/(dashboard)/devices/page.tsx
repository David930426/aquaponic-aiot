"use client";

import { ManagedDevicesGrid } from "@/components/organisms/ManagedDevicesGrid";
import { useT } from "@/hooks/useT";

export default function DevicesPage() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-350">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">
            {t("devices.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("devices.page.subtitle")}
          </p>
        </div>
      </div>
      <ManagedDevicesGrid />
    </div>
  );
}
