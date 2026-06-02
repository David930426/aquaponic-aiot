import { ActiveDevicesList } from "@/components/organisms/ActiveDevicesList";
import { KpiRow } from "@/components/organisms/KpiRow";
import { RecentAlertsList } from "@/components/organisms/RecentAlertsList";
import { SystemHealthGauge } from "@/components/organisms/SystemHealthGauge";
import { WaterQualityChart } from "@/components/organisms/WaterQualityChart";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-350 space-y-4">
      {/* Row 1 — KPI cards */}
      <KpiRow />

      {/* Row 2 — water quality chart (2/3) + system health gauge (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WaterQualityChart />
        </div>
        <div>
          <SystemHealthGauge />
        </div>
      </div>

      {/* Row 3 — active devices (2/3) + recent alerts (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActiveDevicesList />
        </div>
        <div>
          <RecentAlertsList />
        </div>
      </div>
    </div>
  );
}
