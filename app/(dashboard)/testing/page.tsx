"use client";

import { TestingAnomalies } from "@/components/organisms/TestingAnomalies";
import { TestingFaultInjection } from "@/components/organisms/TestingFaultInjection";
import { TestingInjector } from "@/components/organisms/TestingInjector";
import { TestingLiveChart } from "@/components/organisms/TestingLiveChart";
import { TestingSimulator } from "@/components/organisms/TestingSimulator";
import { useT } from "@/hooks/useT";

export default function TestingPage() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-350 space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">
          {t("testing.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("testing.page.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TestingInjector />
        </div>
        <div className="lg:col-span-2">
          <TestingSimulator />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TestingFaultInjection />
        </div>
        <div className="lg:col-span-2">
          <TestingLiveChart />
        </div>
      </div>

      <TestingAnomalies />
    </div>
  );
}
